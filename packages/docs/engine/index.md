---
outline: deep
title: Engine
description: Sidequest.js Engine Overview and API Reference
---

# Engine

The Sidequest engine is the core component that orchestrates job processing, queue management, and worker coordination. This document provides an overview of the main entry point and API for interacting with the Sidequest system.

::: tip Specific Usages

Before you delve into the details, here are some common scenarios you might be interested in:

1. If you want to enable only the engine without starting job processing (e.g., to allow enqueueing only), [you can partially setup Sidequest using `Sidequest.configure`](./configuration.md#_2-partial-startup).
2. If you want to simply run the engine to process jobs without the dashboard, [you can use `Sidequest.start({ dashboard: { enabled: false } })`](./configuration#configuration-options).
3. If you want to only run the dashboard without job processing, [you can use the `SidequestDashboard` class directly](/dashboard#starting-only-the-dashboard).
   :::

## Summary

Sidequest provides a powerful, production-ready job processing system built for Node.js applications. The engine handles:

- **Job Processing**: Reliable execution with retry mechanisms and failure handling
- **Queue Management**: Multiple queues with configurable concurrency and priorities
- **Worker Coordination**: Efficient distribution of jobs across worker threads
- **State Management**: Comprehensive job lifecycle tracking and transitions
- **Dashboard Integration**: Real-time monitoring and management interface

The main entry point is the `Sidequest` class, which provides static methods to configure, start, and interact with the job processing system.

## Entry Point (Sidequest)

The `Sidequest` class serves as the primary interface for all engine operations. It provides static methods that coordinate the underlying Engine and Dashboard components.

### `Sidequest.configure`

Configures the Sidequest engine system with the provided options. This method initializes the engine but does not start job processing - it's useful when you want to set up configuration without immediately starting the system, e.g., when you want to enqueue jobs but not necessarily process them in that instance.

```typescript
import { Sidequest } from "sidequest";

await Sidequest.configure({
  backend: {
    driver: "@sidequest/postgres-backend",
    config: "postgres://user:password@localhost:5432/mydb",
  },
  maxConcurrentJobs: 20,
  logger: {
    level: "debug",
    json: true,
  },
});
```

**Configuration Options:**

- `backend` - Database backend configuration (defaults to SQLite)
- `queues` - Initial queue configurations
- `logger` - Logging configuration
- `maxConcurrentJobs` - Maximum concurrent job limit
- `jobDefaults` - Default job builder settings
- `queueDefaults` - Default queue settings
- `gracefulShutdown` - Enable graceful shutdown handling

More information about configuration options can be found in the [Configuration Guide](/engine/configuration).

### `Sidequest.start`

Starts the Sidequest engine and dashboard with the provided configuration. This method both configures and starts the entire system, including job processing and the monitoring dashboard. If you have previously configured the engine using `Sidequest.configure`, you can call `Sidequest.start` without any parameters to initiate job processing and the dashboard.

```typescript
import { Sidequest } from "sidequest";

await Sidequest.start({
  backend: {
    driver: "@sidequest/postgres-backend",
    config: process.env.DATABASE_URL,
  },
  dashboard: {
    port: 3000,
    auth: {
      username: "admin",
      password: "secure-password",
    },
  },
});

console.log("Sidequest started! Dashboard: http://localhost:3000");
```

The `start` method configuration options are the same as `Sidequest.configure` plus the Dashboard options. For more configuration details, refer to the [Configuration Guide](/engine/configuration).

## Using `Sidequest.job` and `Sidequest.queue`

Sidequest provides two main operational interfaces for managing jobs and queues after the system is configured.

### `Sidequest.job`

The job operations interface provides comprehensive job management capabilities:

```typescript
// Get a specific job
const job = await Sidequest.job.get(jobId);

// List jobs with filters
const jobs = await Sidequest.job.list({
  queue: "email",
  state: ["waiting", "running"],
  limit: 50,
});

// Get job counts by state
const counts = await Sidequest.job.count();

// Job state management
await Sidequest.job.cancel(jobId);
await Sidequest.job.run(jobId, { force: true });
await Sidequest.job.snooze(jobId, 5 * 60 * 1000); // 5 minutes

// Maintenance operations
await Sidequest.job.findStale();
await Sidequest.job.deleteFinished(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
```

### `Sidequest.queue`

The queue operations interface enables dynamic queue management:

```typescript
// Get queue information
const queue = await Sidequest.queue.get("email");

// List all queues
const queues = await Sidequest.queue.list({
  orderBy: { column: "priority", order: "desc" },
});

// Queue state management
await Sidequest.queue.pause("email");
await Sidequest.queue.activate("email");
await Sidequest.queue.toggle("email");

// Queue configuration
await Sidequest.queue.setConcurrency("email", 5);
await Sidequest.queue.setPriority("email", 100);

// Create new queues dynamically
await Sidequest.queue.create({
  name: "high-priority",
  concurrency: 10,
  priority: 200,
  state: "active",
});
```

## Building and Enqueuing Jobs

You can create and enqueue jobs using the builder pattern. This method is callable after the engine has been configured, thus you don't need to actually start the engine to build and enqueue jobs.

```typescript
import { EmailJob } from "./jobs/EmailJob.js";

// Simple job enqueuing
await Sidequest.build(EmailJob).enqueue("user@example.com", "Welcome!", "Thanks for signing up!");

// Advanced job configuration
await Sidequest.build(EmailJob)
  .queue("email")
  .timeout(30000)
  .maxAttempts(3)
  .availableAt(new Date(Date.now() + 60000)) // 1 minute delay
  .uniqueness({ key: "email", ttl: 300000 }) // 5 minute uniqueness
  .enqueue("user@example.com", "Welcome!", "Thanks for signing up!");
```

For more details on job building and enqueuing patterns, refer to the [Enqueue Guide](/engine/enqueue).

## Related Documentation

For more detailed information about specific engine features, check out these related guides:

- **[Configuration](/engine/configuration)** - Detailed configuration options and backend setup
- **[Starting](/engine/starting)** - Engine startup process and initialization
- **[Enqueue](/engine/enqueue)** - Job building and enqueuing patterns
- **[Graceful Shutdown](/engine/graceful-shutdown)** - Proper shutdown procedures
- **[Cleanup](/engine/cleanup)** - Maintenance and cleanup operations

For broader system documentation:

- **[Jobs](/jobs/index)** - Creating and managing job classes
- **[Queues](/queues/index)** - Queue concepts and management
- **[Dashboard](/dashboard)** - Web interface for monitoring and management
