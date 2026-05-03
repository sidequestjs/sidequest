---
title: Alternatives
description: Sidequest compared to BullMQ, Agenda, pg-boss, Solid Queue, and Oban.
---

# Alternatives

> **Work in progress.** This comparison is being researched and written. Values will be sourced from official documentation with a timestamp.

A quick overview of how Sidequest fits alongside other Node.js background job libraries.

| Feature | Sidequest | BullMQ | Agenda | pg-boss |
|---|---|---|---|---|
| Storage | SQL / MongoDB | Redis | MongoDB | Postgres only |
| Transactional enqueue | ✅ | ❌ | ❌ | ✅ |
| Worker threads | ✅ | ✅ | ❌ | ❌ |
| Web dashboard | ✅ | Via Bull Board | ❌ | ❌ |
| TypeScript-first | ✅ | ✅ | Partial | Partial |
| Unique jobs | ✅ | ✅ | ❌ | ✅ |
| Cron / recurring | ✅ | ✅ | ✅ | ✅ |

_Last updated: 2026-05. Always verify against the projects' current documentation._

## Where BullMQ wins

BullMQ is mature, has a large ecosystem, and Redis can sustain extremely high throughput. If you already run Redis and need maximum job/sec throughput, BullMQ is a strong choice.

## Where Agenda wins

Agenda has the lowest barrier to entry if you're already on MongoDB and don't need strict ordering or high concurrency.

## Where pg-boss wins

pg-boss is a focused Postgres-only queue with excellent atomic enqueue semantics and a very small footprint. If you don't need a dashboard or multi-backend support, pg-boss is worth evaluating.

## Where Sidequest wins

- **No Redis** — one fewer service to operate.
- **Transactional enqueue** — enqueue inside your existing DB transactions.
- **Multi-backend** — works on Postgres, MySQL, SQLite, and MongoDB.
- **Included dashboard** — no extra packages needed to see job status.
