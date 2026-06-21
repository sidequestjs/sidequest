---
outline: deep
title: Migrating from BullMQ
description: A practical, side-by-side guide to migrating background jobs from BullMQ (or Bull) to Sidequest, swapping Redis for your existing SQL or document database.
---

# Migrating from BullMQ

This guide maps BullMQ (and Bull) concepts onto Sidequest so you can move your background jobs over without relearning everything. The biggest change is conceptual, not mechanical: BullMQ splits work across a `Queue` (producer), a `Worker` (consumer), and a Redis connection that ties them together. Sidequest collapses that into a single **`Job` class** persisted in the **database you already run** (Postgres, MySQL, SQLite, or MongoDB). There is no Redis to provision.

If you are weighing the move before committing to it, read [Why Sidequest](/introduction/why) first. This page assumes you have already decided.

## Mental model

| BullMQ                                            | Sidequest                                                                 |
| ------------------------------------------------- | ------------------------------------------------------------------------ |
| Redis connection (`ioredis`)                      | A [backend driver](/production/backends) pointed at your existing DB     |
| `new Queue('emails', { connection })`             | A queue is just a name. It is created on demand; no object to hold.       |
| `queue.add('send', data, opts)`                   | `Sidequest.build(EmailJob).enqueue(...args)`                             |
| `new Worker('emails', processor, { connection })` | A [`Job` class](/guide/jobs/class) with an `async run(...args)` method   |
| `job.data` (one payload object)                   | Positional arguments to `run(...args)`                                    |
| `{ attempts: 3 }`                                 | `.maxAttempts(3)`                                                         |
| `{ backoff: { type, delay } }`                    | `.backoffStrategy("fixed" \| "exponential")` + `.retryDelay(ms)`        |
| `{ delay: 60000 }`                                | `.availableAt(new Date(Date.now() + 60000))`                            |
| `{ repeat: { pattern } }`                         | `.schedule(cronExpression, ...args)`                                     |
| `{ jobId }` for deduplication                     | `.unique(...)`                                                            |
| `{ removeOnComplete }`                            | Automatic [cleanup routine](/production/cleanup)                         |
| `QueueEvents` / `worker.on(...)`                  | [Dashboard](/resources/dashboard) + job lifecycle states                |
| `FlowProducer` (parent/child)                     | [Job chaining](/recipes/chaining)                                        |
| `Worker({ concurrency })`                         | Per-queue [concurrency](/guide/queues/concurrency)                       |

## 1. Swap the dependencies

Remove BullMQ and Redis, add Sidequest plus the [driver](/production/backends) for the database you already use.

```bash
npm uninstall bullmq ioredis
npm install sidequest @sidequest/postgres-backend
```

There is no separate Redis client and no Redis service to run. Jobs live in a table (or collection) in your application database.

## 2. Connection becomes a backend

There is no long-lived Redis connection to wire through producers and consumers. You configure the backend once at startup, and `Sidequest.start()` runs the migrations that create the job tables.

::: code-group

```typescript [BullMQ]
import { Queue, Worker } from "bullmq";

const connection = { host: "127.0.0.1", port: 6379 };

const emailQueue = new Queue("emails", { connection });
const emailWorker = new Worker("emails", processor, { connection });
```

```typescript [Sidequest]
import { Sidequest } from "sidequest";

await Sidequest.start({
  backend: {
    driver: "@sidequest/postgres-backend",
    config: process.env.DATABASE_URL,
  },
});
// Jobs and workers are discovered from your Job classes; nothing else to wire.
```

:::

If a process only enqueues and should not run jobs, use [`Sidequest.configure()`](/api/sidequest) instead of `start()`.

## 3. A Worker processor becomes a Job class

A BullMQ `Worker` is a processor function bound to a queue name. In Sidequest the unit of work is a class extending `Job`, and its `run` method receives the arguments you enqueued, **positionally**, instead of a single `job.data` object.

::: code-group

```typescript [BullMQ]
import { Worker } from "bullmq";

new Worker(
  "emails",
  async (job) => {
    const { to, subject, body } = job.data;
    await sendEmail(to, subject, body);
    return { sent: true };
  },
  { connection },
);
```

```typescript [Sidequest]
// jobs/EmailJob.ts
import { Job } from "sidequest";

export class EmailJob extends Job {
  async run(to: string, subject: string, body: string) {
    await sendEmail(to, subject, body);
    return { sent: true }; // a returned value marks the job completed
  }
}
```

:::

The value you return is recorded as the job result. To control the outcome explicitly from inside `run`, you can `return this.complete(result)`, `this.fail(reason)`, `this.retry(reason, delay?)`, or `this.snooze(delay)` (see [Execution and Control](/guide/jobs/running)).

## 4. Adding jobs

`queue.add(name, data, opts)` becomes `Sidequest.build(JobClass)...enqueue(...args)`. The fluent builder replaces the options object.

::: code-group

```typescript [BullMQ]
await emailQueue.add(
  "send",
  { to: "user@example.com", subject: "Welcome!", body: "Thanks for signing up!" },
  { attempts: 3, backoff: { type: "exponential", delay: 1000 } },
);
```

```typescript [Sidequest]
import { Sidequest } from "sidequest";
import { EmailJob } from "./jobs/EmailJob.js";

await Sidequest.build(EmailJob)
  .queue("emails")
  .maxAttempts(3)
  .backoffStrategy("exponential")
  .retryDelay(1000)
  .enqueue("user@example.com", "Welcome!", "Thanks for signing up!");
```

:::

## 5. Option-by-option mapping

### Retries and backoff

```typescript
// BullMQ
await queue.add("send", data, { attempts: 5, backoff: { type: "fixed", delay: 3000 } });

// Sidequest
await Sidequest.build(EmailJob).maxAttempts(5).backoffStrategy("fixed").retryDelay(3000).enqueue(...args);
```

BullMQ's `attempts` counts the total number of tries, and so does Sidequest's [`maxAttempts`](/guide/jobs/enqueueing#maxattempts-count-number). Sidequest defaults to `"exponential"` backoff with a `1000` ms base, the same spirit as BullMQ's recommended default.

### Delayed jobs

BullMQ takes a relative delay in milliseconds; Sidequest takes an absolute `Date`.

```typescript
// BullMQ: run in 1 minute
await queue.add("send", data, { delay: 60_000 });

// Sidequest: run in 1 minute
await Sidequest.build(EmailJob)
  .availableAt(new Date(Date.now() + 60_000))
  .enqueue(...args);
```

### Recurring / repeatable jobs

BullMQ's `repeat` becomes [`.schedule()`](/guide/jobs/enqueueing#schedule-cronexpression-string-args-unknown), which registers a cron via [node-cron](https://www.npmjs.com/package/node-cron).

```typescript
// BullMQ
await queue.add("digest", data, { repeat: { pattern: "0 9 * * *" } });

// Sidequest
await Sidequest.build(DailyDigestJob).queue("reports").schedule("0 9 * * *", userId);
```

::: warning Scheduling is in-memory
Unlike BullMQ, where repeatable jobs are stored in Redis, Sidequest's schedule registration lives **in process memory** and must be re-registered on startup. In a multi-instance deployment, every instance will register the same schedule, so combine it with [`.unique()`](/guide/jobs/enqueueing#unique-configuration-uniquenessinput) (for example `period: "day"`) to deduplicate, or run scheduling on a single node. The jobs it enqueues are persisted normally.
:::

### Deduplication

BullMQ deduplicates by passing an explicit `jobId`. Sidequest has a richer [uniqueness](/guide/jobs/enqueueing#unique-configuration-uniquenessinput) system built in.

```typescript
// BullMQ: one job per id
await queue.add("send", data, { jobId: `welcome:${userId}` });

// Sidequest: unique per arguments while one is alive...
await Sidequest.build(EmailJob).unique({ withArgs: true }).enqueue(userId);

// ...or one per argument set per time window
await Sidequest.build(EmailJob).unique({ withArgs: true, period: "hour" }).enqueue(userId);
```

### Cleaning up finished jobs

There is no per-job `removeOnComplete`. Sidequest runs an automatic [cleanup routine](/production/cleanup) that prunes finished jobs on a schedule, and you can trigger pruning manually with `Sidequest.job.deleteFinished()`.

### Concurrency

BullMQ sets concurrency on the `Worker`. In Sidequest, concurrency is a property of the [queue](/guide/queues/concurrency).

```typescript
// BullMQ
new Worker("emails", processor, { connection, concurrency: 5 });

// Sidequest: configure the queue at startup
await Sidequest.start({
  queues: [{ name: "emails", concurrency: 5 }],
  backend: { driver: "@sidequest/postgres-backend", config: process.env.DATABASE_URL },
});
```

## 6. Events and monitoring

BullMQ surfaces progress through `QueueEvents` and `worker.on("completed" | "failed", ...)`, and dashboards like Bull Board are a separate install. Sidequest ships a [web dashboard](/resources/dashboard) out of the box (enabled by `Sidequest.start()`), and every job moves through explicit [lifecycle states](/guide/jobs/lifecycle) you can query with `Sidequest.job.list()` / `Sidequest.job.get(id)`. Because jobs are rows, you can also just look:

```sql
SELECT * FROM sidequest_jobs WHERE state = 'failed';
```

## 7. Flows (parent/child)

BullMQ's `FlowProducer` models parent/child trees. Sidequest models the same dependency by enqueueing the next job from inside `run` once the current one succeeds. See the [Job Chaining recipe](/recipes/chaining).

```typescript
export class ProcessOrderJob extends Job {
  async run(orderId: string) {
    await chargeCard(orderId);
    // Enqueue the next step only after this one succeeds
    await Sidequest.build(SendReceiptJob).enqueue(orderId);
    return this.complete({ orderId });
  }
}
```

## What is genuinely different

- **No Redis, no separate Worker process.** You do not run a dedicated worker fleet bound to Redis. The engine runs in a forked child process by default and executes jobs in worker threads. See [Execution Modes](/production/execution-modes) if you need it to run inline or in your own process (for example serverless or a DI container).
- **Payloads are positional arguments**, not a single `job.data` object. They must be serializable.
- **Schedules are not persisted** (see the warning above). BullMQ stores repeatables in Redis; Sidequest re-registers them at startup.
- **Throughput profile differs.** Sidequest is built to remove an operational dependency, not to win a 100k jobs/sec benchmark on a dedicated Redis cluster. For the vast majority of product workloads this is a non-issue; if you genuinely need that ceiling, see [When Redis-based queues make more sense](/introduction/why#when-redis-based-queues-make-more-sense).

## Next steps

- [Quick Start](/getting-started/quick-start) - get a first job running in minutes
- [Configuration](/getting-started/configuration) - all engine options
- [Backends](/production/backends) - choose and configure your database driver
- [Enqueueing Jobs](/guide/jobs/enqueueing) - the full JobBuilder reference
