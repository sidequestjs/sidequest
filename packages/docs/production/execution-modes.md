---
outline: deep
title: Execution Modes
description: Choose how and where Sidequest runs your jobs (forked vs in-process, thread pool vs inline) and how cooperative timeout/cancellation works.
---

# Execution Modes

By default Sidequest runs your jobs with **two layers of isolation**: the engine runs in a forked child process, and each job runs in its own worker thread inside that process (see [How It Works](/introduction/how-it-works)). This is the most robust setup and what you want in most deployments.

Some environments and integrations need a different trade-off. Two independent options let you change where and how jobs run:

- [`fork`](#fork-process-isolation): run the engine in a child process (default) or in your application's process.
- [`runner`](#runner-thread-pool-vs-inline): run each job in a worker thread pool (default) or inline in the current thread.

They are orthogonal: `fork` controls the **process**, `runner` controls the **thread**. A related option, [`abortGracePeriodMs`](#cooperative-timeout-and-cancellation), controls how timeouts and cancellations stop a running job.

::: tip TL;DR
Keep the defaults (`fork: true`, `runner: "thread"`) unless you have a concrete reason not to. Reach for `inline` + `fork: false` for serverless, test suites, or framework integrations that need jobs to share live in-process state.
:::

## `fork`: process isolation

```typescript
await Sidequest.start({ fork: false }); // default: true
```

| Value            | Where the engine runs      | Crash isolation                                                                                    |
| ---------------- | -------------------------- | -------------------------------------------------------------------------------------------------- |
| `true` (default) | A `child_process.fork`     | A job crash (or `process.exit()`) kills the fork, not your app. The engine restarts automatically. |
| `false`          | Your application's process | No isolation. An uncaught error in job code can take down your app.                                |

Use `fork: false` when:

- You can't spawn child processes (many **serverless / edge** runtimes).
- You're running an **integration test** and want to avoid IPC and process teardown flakiness.
- Your jobs need access to **live, in-process state** that can't cross a process boundary, for example a dependency-injection container (this is what `@sidequest/nestjs` relies on).

::: danger No crash isolation with `fork: false`
With the default `fork: true`, a job that throws an unhandled exception or calls `process.exit()` only takes down the engine fork, and Sidequest restarts it. With `fork: false`, the engine shares your application's process: **a misbehaving job can crash your whole app.** Only use it when you understand and accept that.
:::

## `runner`: thread pool vs inline

```typescript
await Sidequest.start({ runner: "inline" }); // default: "thread"
```

| Value                | How a job runs                                                     | CPU isolation | Can be force-stopped?                 |
| -------------------- | ------------------------------------------------------------------ | ------------- | ------------------------------------- |
| `"thread"` (default) | In a [piscina](https://github.com/piscinajs/piscina) worker thread | Yes           | Yes (the worker thread is terminated) |
| `"inline"`           | Directly in the current thread, no pool                            | No            | **No**                                |

With `runner: "thread"`, `minThreads` / `maxThreads` / `idleWorkerTimeout` size the pool, and a job can be forcibly stopped by terminating its worker thread.

With `runner: "inline"`, there is no pool and no separate thread. This is required when jobs must reach state that lives in the current thread, and it's handy for single-process setups. But it comes with two important consequences:

::: warning Inline jobs block the event loop
An inline job runs on the same thread as everything else in that process: the dispatcher, and your app too if `fork: false`. A **CPU-bound** inline job will starve all of it until it finishes. Keep inline jobs I/O-bound, or use the thread pool for heavy work.
:::

::: danger Inline jobs cannot be forcibly stopped
There is no separate thread to terminate, so Sidequest **cannot** kill a running inline job. Timeouts and cancellation only work if the job **cooperates** with the abort signal (see [Cooperative timeout and cancellation](#cooperative-timeout-and-cancellation) below). A job that ignores the signal runs to completion no matter what.
:::

## Choosing a combination

`fork` and `runner` combine into four setups:

| `fork`  | `runner` | Crash isolation  | CPU isolation | Typical use                                                             |
| ------- | -------- | ---------------- | ------------- | ----------------------------------------------------------------------- |
| `true`  | `thread` | ✅               | ✅            | **Default.** Production.                                                |
| `true`  | `inline` | ✅ (engine fork) | ❌            | Lighter execution with crash isolation kept; e.g. SQLite single-writer. |
| `false` | `thread` | ❌               | ✅            | Run in-process but still isolate CPU per job.                           |
| `false` | `inline` | ❌               | ❌            | Serverless, tests, and DI/framework integrations (e.g. NestJS).         |

::: code-group

```typescript [Serverless / single-process]
// No child process, no worker threads: everything in one place.
await Sidequest.start({
  fork: false,
  runner: "inline",
  backend: { driver: "@sidequest/postgres-backend", config: process.env.DATABASE_URL },
});
```

```typescript [SQLite]
// SQLite is single-writer; running jobs inline avoids cross-thread write contention.
await Sidequest.start({
  runner: "inline",
  maxConcurrentJobs: 1,
  backend: { driver: "@sidequest/sqlite-backend", config: "./jobs.sqlite" },
});
```

```typescript [Integration tests]
await Sidequest.start({
  fork: false, // no IPC to wait on
  runner: "inline", // deterministic, in-process execution
  backend: { driver: "@sidequest/sqlite-backend", config: ":memory:" },
});
```

:::

::: warning SQLite and concurrency
SQLite allows a single writer. Concurrency above 1 against the same file leads to `SQLITE_BUSY`. Keep `maxConcurrentJobs: 1`, use a separate `.sqlite` file from your app, or use a server database (Postgres/MySQL) for real concurrency. This is independent of the execution mode.
:::

## Cooperative timeout and cancellation

A job is stopped early in two cases: it exceeds its `timeout`, or it is canceled (via the dashboard or `Sidequest.job.cancel(id)`). How that actually stops the job depends on the mode.

Sidequest hands every job an [`AbortSignal`](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal) at `this.abortSignal`. When a timeout or cancellation fires, that signal aborts. Your job can observe it and stop:

```typescript
import { Job } from "sidequest";

export class SyncContactsJob extends Job {
  async run(accountId: string) {
    // 1. Hand the signal to anything that accepts one; it aborts automatically.
    const res = await fetch(`https://api.example.com/${accountId}/contacts`, {
      signal: this.abortSignal,
    });
    const contacts = await res.json();

    // 2. For long loops or CPU work, check it cooperatively.
    for (const contact of contacts) {
      this.abortSignal.throwIfAborted(); // bail out promptly on timeout/cancel
      await upsert(contact);
    }

    return this.complete({ synced: contacts.length });
  }
}
```

`this.abortSignal.reason` tells you _why_ it aborted. It is a `JobTimeout` or a `JobCanceled`:

```typescript
import { JobTimeout, JobCanceled } from "sidequest";

this.abortSignal.addEventListener("abort", () => {
  const reason = this.abortSignal.reason;
  if (reason instanceof JobTimeout) {
    // exceeded `timeout`
  } else if (reason instanceof JobCanceled) {
    // canceled by an operator
  }
});
```

### When does the job actually receive the signal?

| Mode                                                  | Gets a live `abortSignal`?        | If the job ignores it                         |
| ----------------------------------------------------- | --------------------------------- | --------------------------------------------- |
| `runner: "inline"`                                    | **Always**                        | Runs to completion (cannot be force-stopped). |
| `runner: "thread"`, `abortGracePeriodMs: 0` (default) | No (worker is killed immediately) | Killed right away.                            |
| `runner: "thread"`, `abortGracePeriodMs > 0`          | Yes, for the grace window         | Killed after the grace period.                |

::: danger Inline timeout/cancel only work if your job honors the signal
In `runner: "inline"` there is no way to forcibly stop a job. If your job does not pass `this.abortSignal` to its async work or check `this.abortSignal.aborted` / `throwIfAborted()`, then **timeouts and cancellation have no effect**: the job keeps running until it returns on its own. Treat `this.abortSignal` as mandatory for any long-running inline job.
:::

### `abortGracePeriodMs`: graceful kill for thread jobs

```typescript
await Sidequest.start({ abortGracePeriodMs: 5000 }); // default: 0
```

Applies only to `runner: "thread"`. It controls the window between _signaling_ an abort and _forcibly terminating_ the worker thread:

- `0` (default): the worker is terminated immediately. The job is not given a chance to react, and `this.abortSignal` is not delivered to it. This is the historical behavior.
- `> 0`: the abort is delivered to the job via `this.abortSignal` first; if the job has not finished after this many milliseconds, the worker thread is terminated. Use this to let thread jobs clean up (close handles, flush buffers) before being killed.

::: tip
A positive grace period allocates a small message channel per job to deliver the abort into the worker. The cost only applies while a grace period is configured, and only matters for the rare cancel/timeout. Leave it at `0` unless your thread jobs need graceful shutdown.
:::

### What state does the job end in?

The terminal state is decided when the run **actually ends**, never while it is still running (so a job is never re-queued while a copy of it is still in flight):

| What happened                                                        | Terminal state                                                                                                                                      |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| The job returned a value/transition (it finished)                    | Whatever the job returned (`completed`, `failed`, a retry, etc.). This holds **even if** a timeout/cancel was signaled but the job finished anyway. |
| The worker was hard-killed by a **timeout** (thread, no result)      | Retried (or `failed` if no attempts remain).                                                                                                        |
| The worker was hard-killed by a **cancellation** (thread, no result) | `canceled`.                                                                                                                                         |
| The job threw an unexpected error                                    | Retried (or `failed`).                                                                                                                              |

::: warning Canceling a running inline job is best-effort
Because an inline job's result is respected once it returns, a running inline job that **ignores** a cancellation and finishes will be recorded with its own result (e.g. `completed`), not `canceled`. Cancellation of a _running_ inline job only takes effect if the job honors `this.abortSignal`. Canceling a **waiting** job always works (it is simply never claimed).
:::

## Next steps

- [Execution and Control](/guide/jobs/running): using `this.abortSignal` inside `run()`
- [Configuration reference](/getting-started/configuration): all engine options
- [Graceful Shutdown](/production/graceful-shutdown): draining jobs on shutdown
