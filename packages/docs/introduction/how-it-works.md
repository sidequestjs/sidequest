---
title: How It Works
description: Sidequest architecture — two layers of isolation, piscina worker threads, and a DB-backed queue.
---

# How It Works

Sidequest runs your background jobs in two layers of isolation so that a crashing job cannot affect your main application, and jobs from different queues cannot starve each other.

## The two-process model

When you call `Sidequest.start()`, your app **forks a child process** to run the engine. All scheduling, dispatching, and thread management happen in that process. Your app communicates with the engine over IPC.

```
Your app process
  │
  ├─ HTTP server, Express routes, etc.        ← still yours, unaffected by job crashes
  │
  └─ fork() ──► Engine child process
                  ├─ Dispatcher              polls DB, claims jobs atomically
                  ├─ QueueManager            tracks concurrency limits per queue
                  └─ piscina thread pool     one worker thread per running job
                         │
                         └─ Job#run()        your code, fully isolated
                                │
                                ▼
                         Database
                         (Postgres / MySQL / SQLite / MongoDB)
```

Because the engine is a separate process, a job that calls `process.exit()` or throws an unhandled exception will kill the engine process but **not your app**. The engine restarts automatically.

::: tip
This forked, worker-thread model is the default and the right choice for most deployments. For serverless runtimes, test suites, or framework integrations that need jobs to share live in-process state, you can run the engine in-process and/or run jobs inline. See [Execution Modes](/production/execution-modes).
:::

## How jobs are claimed

The Dispatcher polls the database at a configurable interval (default: **100 ms**). When it finds waiting jobs that fit within queue concurrency limits, it claims them atomically:

- **SQL backends** use `SELECT ... FOR UPDATE SKIP LOCKED`, which is the same mechanism used by Solid Queue (Rails) and pg-boss. Multiple engine instances can poll the same database without double-issuing a job.
- **MongoDB backend** uses a findOneAndUpdate with a conditional filter for the same effect.

Increasing `jobPollingInterval` reduces database load at the cost of higher job start latency. Lowering it does the opposite.

## Worker threads

Each claimed job runs in its own **worker thread** inside the engine process, managed by [piscina](https://github.com/piscinajs/piscina). Piscina maintains a configurable thread pool (`minThreads` / `maxThreads`). Jobs do not share memory with each other or with the engine's main thread.

The engine dynamically loads your job class into the thread by resolving the source file from a stack trace at enqueue time (auto-resolution). If you use a bundler or serverless platform that mangles paths, you can disable this with `manualJobResolution: true`. See [Manual Job Resolution](/production/manual-resolution) for details.

## Queue model

A queue is a named channel with three settings:

| Setting       | Controls                                                                          |
| ------------- | --------------------------------------------------------------------------------- |
| `concurrency` | Max jobs from this queue running simultaneously                                   |
| `priority`    | Which queue gets the next available worker when multiple queues have waiting jobs |
| `state`       | `active` (processing) or `paused` (no new jobs claimed)                           |

Queue settings are stored in the database and can be changed at runtime via the dashboard or `Sidequest.queue.*` methods. If you list a queue in `start({ queues: [...] })`, those values override whatever is in the database on startup.

## Job lifecycle

```
waiting → claimed → running → completed
                          ↘ failed → (retry) → waiting
                          ↘ cancelled
                          ↘ snoozed → waiting (after delay)
```

The Dispatcher moves jobs from `waiting` to `claimed`, then the executor moves them to `running`. Your `run()` method returns (or throws) and the executor writes the final state. Stale jobs stuck in `running` or `claimed` past a configurable age are automatically reset to `waiting` by a background routine.

See [Job Lifecycle](/guide/jobs/lifecycle) for the full state diagram and transition rules.

## Next steps

- [Configuration reference](/getting-started/configuration) — all engine options
- [Backends](/production/backends) — choosing and connecting a database driver
- [Queue management](/guide/queues/) — concurrency, priority, and states
