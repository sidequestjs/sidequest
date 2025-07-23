---
outline: deep
title: Graceful Shutdown
description: Graceful shutdown guide for Sidequest.js
---

# Graceful Shutdown

When your application receives a `SIGINT` or `SIGTERM` signal, Sidequest initiates a graceful shutdown: it waits for all currently running jobs to complete before exiting. This helps prevent data loss and ensures that tasks finish cleanly.

If a second termination signal is received before all jobs finish, Sidequest will immediately abort all running jobs and stop. In this situation, jobs in the `claimed` or `running` state may be interrupted before the engine can update their status to `completed` or `failed`. As a result, upon restart, Sidequest may incorrectly believe those jobs are still owned by a worker, leaving them in a stale state and blocking their execution.

To address this, Sidequest automatically detects and releases stale jobs while running. If a job remains in the `running` state after its timeout period has expired, Sidequest considers it stale and returns it to the queue for retry by another worker. This ensures reliable job recovery after forceful shutdowns or unexpected interruptions, keeping your task queues healthy and preventing jobs from becoming permanently stuck.
