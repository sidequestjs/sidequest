---
title: Why Sidequest
description: Why Sidequest exists — skip Redis, reuse your database for background jobs.
---

# Why Sidequest

> **Work in progress.** This page is being rewritten. See [Quick Start](/getting-started/quick-start) to get started right now.

Sidequest is a production-grade background job processor for Node.js that stores jobs in your existing SQL or MongoDB database — no Redis required.

## The problem

Most Node.js job queues require Redis. Redis is a great piece of software, but it is another service to deploy, secure, monitor, and pay for — and it cannot participate in your database transactions.

## The solution

Sidequest persists jobs in the same Postgres, MySQL, SQLite, or MongoDB database your app already uses. This means:

- **One fewer service** to run, back up, and monitor in production.
- **Transactional enqueue** — `INSERT user + enqueue welcome email` in one atomic database transaction. No race conditions.
- **Familiar tools** — inspect jobs with the same SQL client you already have.

## Who it's for

Startups and small teams who want reliable background processing without the operational overhead of Redis. If you already have Postgres running, Sidequest requires zero extra infrastructure.

## How it compares

See the [Alternatives](/introduction/comparison) page for a side-by-side comparison with BullMQ, Agenda, pg-boss, and others.
