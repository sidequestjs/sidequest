---
title: How It Works
description: Sidequest architecture — two layers of isolation, piscina worker threads, and a DB-backed queue.
---

# How It Works

> **Work in progress.** Architecture deep-dive coming soon.

Sidequest uses two layers of isolation to ensure job failures never affect your main application:

1. **Engine child process** — the scheduler and executor run in a forked child process. A crash in job code cannot kill your app.
2. **Worker threads (piscina)** — each job executes in an isolated worker thread inside the engine process.

```
Your app process
  └─ fork() ──► Engine process
                  ├─ Dispatcher   (polls DB, claims jobs)
                  ├─ QueueManager (per-queue concurrency limits)
                  └─ piscina pool (worker threads)
                       └─ Job#run() runs here
                              │
                              ▼
                       Database (Postgres / MySQL / SQLite / MongoDB)
```

The Dispatcher polls the database at a configurable interval (default: 100 ms), claims jobs atomically using `SELECT ... FOR UPDATE SKIP LOCKED` (SQL backends), and passes them to the thread pool.

For a full configuration reference, see [Configuration](/getting-started/configuration).
