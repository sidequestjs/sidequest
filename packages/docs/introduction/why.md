---
title: Why Sidequest
description: Why Sidequest exists — skip Redis, reuse your database for background jobs in Node.js.
---

# Why Sidequest

## The standard approach adds a service you didn't ask for

Most Node.js job queues require Redis. Add a job queue to your app, and suddenly you have a second stateful service to:

- provision and pay for (typically $15–50/month on managed platforms)
- back up and restore
- monitor for memory pressure
- secure with credentials and network rules
- keep in sync with your app's deployment lifecycle

Redis is excellent software. But for many teams, it is infrastructure overhead in search of a problem that already has a perfectly good solution sitting in the database they already run.

## Sidequest stores jobs where your data already lives

Sidequest persists jobs in your existing Postgres, MySQL, SQLite, or MongoDB database. The job queue is just a table (or collection). That means:

**One fewer moving part.** No Redis to provision, monitor, or wake up at 2 am about.

**Lower cost.** No managed Redis instance. If you're on Heroku, Railway, Render, or Fly.io, that's one fewer add-on bill.

**Shared database, no split-brain.** Because jobs live in the same database as your application data, you don't have the Redis split-brain problem — a Redis queue can have jobs for rows that were never committed, or miss jobs for rows that were. Sidequest doesn't have that gap. A first-class `withTransaction(trx)` API for atomic enqueue is on the roadmap.

**Familiar tooling.** Inspect the job queue with the same SQL client you use for everything else. `SELECT * FROM sidequest_jobs WHERE state = 'failed'` — you know how to do that already.

## Who this is for

Sidequest is aimed at startups and small product teams who want reliable background processing without the operational overhead of an additional service. If you are already running Postgres (and most teams are), adding Sidequest requires zero extra infrastructure.

This is the same thesis as [Solid Queue](https://dev.37signals.com/introducing-solid-queue/) in Rails and [Oban](https://getoban.pro/) in Elixir: use the database you already trust, leverage its guarantees, and keep your system simple.

## When Redis-based queues make more sense

Sidequest does not try to out-benchmark BullMQ at 100k jobs/sec on a dedicated Redis cluster. If you need extreme throughput, you already have Redis, or you are building a multi-tenant SaaS where queue infrastructure is a first-class concern — a Redis-based queue may be the right tool.

## What Sidequest provides

- **Multiple backends** — Postgres, MySQL, SQLite, MongoDB. Use what you have.
- **Fluent job builder** — `Sidequest.build(EmailJob).queue("email").maxAttempts(3).enqueue(to, subject)`
- **Unique jobs** — prevent duplicate enqueues with configurable uniqueness keys and TTLs.
- **Recurring jobs** — `cron`-based scheduling with in-process registration.
- **Web dashboard** — monitor, requeue, cancel, and pause from a built-in UI.
- **Worker thread isolation** — jobs run in piscina worker threads; the engine itself runs in a forked child process.
- **Automatic stale recovery** — jobs stuck in `running` past a configurable age are automatically reset.
- **TypeScript-native** — full types for jobs, queues, and configuration.

Ready to try it? Head to [Installation](/getting-started/installation) or jump straight to the [Quick Start](/getting-started/quick-start).
