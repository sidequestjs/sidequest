---
outline: deep
title: Queues
description: Manage queues in Sidequest. Configure concurrency, priority, and states to control how background jobs are processed.
---

# Queues in Sidequest

Sidequest organizes job processing into **queues**.\
Each queue is a separate logical channel, with its own concurrency, priority, and state configuration.\
This page explains what queues are, how they work in Sidequest, how to configure and manage them, and best practices for using them in production.

## What is a queue?

A **queue** in Sidequest is a logical grouping of jobs that share the same operational purpose or priority.\
When you enqueue a job, it is associated with a queue (by default `default`).\
Sidequest manages queues to ensure each one adheres to its configuration while using resources efficiently.

## Why use multiple queues?

✅ **Isolate different workloads** for example, separate queues for emails, reports, push notifications.\
✅ **Control concurrency** limit heavy jobs without affecting fast jobs.\
✅ **Prioritize critical tasks** ensure high-priority jobs are handled first.\
✅ **Pause without losing jobs** suspend a queue without discarding its waiting jobs.

## How does Sidequest manage queues?

- Each queue is processed by an internal pool of workers, respecting its `concurrency` limit.
- Priority between queues is considered when multiple queues have ready jobs.
- Jobs in a `paused` queue remain waiting until the queue is activated.
- The total number of concurrent jobs never exceeds `maxConcurrentJobs` even with multiple active queues.

## Queue states

A queue in Sidequest can be in one of these states:

| State      | Description                                                                             |
| ---------- | --------------------------------------------------------------------------------------- |
| **active** | The queue is active and processing jobs normally.                                       |
| **paused** | The queue is temporarily stopped. No new jobs start, but already running jobs continue. |

You can change a queue's state at any time via the Dashboard (if enabled) or administrative API.

## Configuring queues in `Sidequest.start()`

When initializing Sidequest, you define available queues in the `queues` parameter:

```ts
await Sidequest.start({
  queues: [
    { name: "default", concurrency: 2, priority: 50 },
    { name: "critical", concurrency: 5, priority: 100 },
    { name: "reports", concurrency: 1, state: "paused" },
  ],
});
```

### Queue properties

| Property        | Type                     | Required | Description                                                            |
| --------------- | ------------------------ | -------- | ---------------------------------------------------------------------- |
| **name**        | `string`                 | ✅       | Unique name of the queue.                                              |
| **concurrency** | `number`                 |          | Maximum number of parallel jobs in this queue. Default: `10`           |
| **priority**    | `number`                 |          | Relative order among queues. Higher means more priority. Default: `0`. |
| **state**       | `"active"` or `"paused"` |          | Initial state. Default: `"active"`.                                    |

## Enqueuing jobs to queues

When you enqueue a job, specify the target queue using `.queue`, function:

```ts
await Sidequest.build(SendEmailJob).queue("email").enqueue({ to: "user@example.com" });
```

If not specified, the job goes to the `default` queue.

## Monitoring queues

When the dashboard is enabled (`dashboard.enabled: true`), you can:

✅ See the current status of each queue.\
✅ See how many jobs are waiting, running, completed, or failed per queue.\
✅ Activate or pause queues manually.

This is the recommended way to operate in production.

## Best practices for queues

- 📊 **Define clear priorities** jobs that are truly critical should have higher priority.
- 🧩 **Separate heavy workloads** to prevent light jobs from getting blocked.
- 🧪 **Monitor and adjust** use the dashboard to observe behavior and tweak `concurrency` and `priority` as needed.
- 🔄 **Pause for maintenance** use `paused` to temporarily stop jobs without losing them.
