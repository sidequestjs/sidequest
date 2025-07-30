---
outline: deep
title: Starting the Engine
description: How to start and stop the Sidequest engine
---

# Starting the Engine

The Sidequest engine is started using the `Sidequest.start()` method, which initializes the job processing system, creates worker processes, and optionally starts the dashboard. This guide covers the startup process and lifecycle management.

## Using `Sidequest.start()`

The `Sidequest.start()` method is the primary way to launch the Sidequest job processing system. If you want to start Sidequest with the default SQLite backend, you can simply call:

```typescript
import { Sidequest } from "sidequest";

await Sidequest.start();
```

However, in production or when using a different backend, you will need to provide configuration options. For example, to use the PostgreSQL backend, you would do:

```typescript
import { Sidequest } from "sidequest";

await Sidequest.start({
  backend: {
    driver: "@sidequest/postgres-backend",
    config: "postgresql://postgres:postgres@localhost:5432/postgres",
  },
  dashboard: {
    enabled: true,
    port: 8678,
  },
});

console.log("Sidequest is running!");
```

::: info
For detailed configuration options, see the [Configuration Guide](/engine/configuration).
:::

:::tip
If you called `Sidequest.configure()` earlier, you can call `Sidequest.start()` without parameters to start the engine with the previously set configuration.
:::

:::warning
Calling `Sidequest.configure()` before `Sidequest.start()` will effectively make Sidequest ignore any configuration passed to `start()`. The engine will use the configuration set in `configure()`.
Similarly, calling `Sidequest.configure()` or `Sidequest.start()` multiple times will not reconfigure or restart the engine.
:::

## What Happens During Startup

When you call `Sidequest.start()`, the following sequence occurs:

### 1. Engine Configuration

- The engine is configured with your provided settings or defaults
- Logger configuration is applied
- Backend connection is established (lazily)
- Database migrations are run (unless `skipMigration: true`)

### 2. Queue Initialization

- All queues specified in the configuration are created or updated
- Queue settings (concurrency, priority, state) are applied

::: warning Queue Configuration Override
When the engine starts, it will **enforce** the queue configurations provided in the startup configuration. This means:

- Existing queue settings will be **overridden** by the configuration
- If you've manually adjusted queue settings via the dashboard or API, they will be reset to the configuration values
- Only queues explicitly defined in the configuration will be updated
- If you don't specify a queue, it will not be created or modified
  :::

### 3. Worker Process Creation

- A main worker process is forked from the parent application
- The worker process handles all job execution in isolation
- Communication between parent and worker is established via IPC

### 4. Dashboard Startup (Optional)

- If dashboard is enabled, the web interface starts
- Express server is configured with authentication (if provided)
- Dashboard becomes accessible at the configured port

## Process Isolation and Safety

One of Sidequest's key safety features is **process isolation**. The actual job processing engine runs in a **forked child process**, separate from your main application:

```text
┌──────────────────┐     IPC     ┌─────────────────────┐
│  Your App        │ ◄─────────► │  Worker Process     │
│  (Parent)        │             │  (Sidequest Engine) │
│                  │             │                     │
│ • API Server     │             │ • Job Processing    │
│ • Business Logic │             │ • Queue Management  │
│ • Sidequest API  │             │ • Error Isolation   │
└──────────────────┘             └─────────────────────┘
```

**Benefits of Process Isolation:**

- **Error Safety**: Unhandled errors in job code won't crash your main application
- **Memory Protection**: Memory leaks in jobs are isolated to the worker process
- **Resource Management**: Worker process can be restarted if needed without affecting your app
- **Performance**: Job processing doesn't block your main application thread

## Startup Examples

### Minimal Startup

```typescript
// Uses SQLite backend with default settings
await Sidequest.start();
```

### Production Startup

```typescript
await Sidequest.start({
  backend: {
    driver: "@sidequest/postgres-backend",
    config: process.env.DATABASE_URL,
  },
  queues: [
    { name: "default", concurrency: 5, priority: 50 },
    { name: "critical", concurrency: 10, priority: 100 },
  ],
  maxConcurrentJobs: 20,
  logger: {
    level: "info",
    json: true,
  },
  dashboard: {
    enabled: true,
    port: parseInt(process.env.DASHBOARD_PORT || "8678"),
    auth: {
      user: process.env.DASHBOARD_USER!,
      password: process.env.DASHBOARD_PASSWORD!,
    },
  },
});
```

### Development Startup

```typescript
await Sidequest.start({
  logger: {
    level: "debug", // Verbose logging
    json: false, // Human-readable logs
  },
  dashboard: {
    enabled: true,
    port: 3000,
    // No auth for local development
  },
});
```

## Error Handling

The `start()` method can throw errors during initialization:

```typescript
try {
  await Sidequest.start(config);
  console.log("Sidequest started successfully");
} catch (error) {
  console.error("Failed to start Sidequest:", error);
}
```

**Common startup errors:**

- Database connection failures
- Missing backend drivers
- Invalid configuration values
- Port conflicts (dashboard)

## Stopping the Engine

To properly shut down Sidequest, use the `Sidequest.stop()` method:

```typescript
// Graceful shutdown
await Sidequest.stop();
console.log("Sidequest stopped");
```

### What Happens During Shutdown

The `stop()` method performs a comprehensive cleanup:

1. **Engine Shutdown**
   - Stops accepting new jobs
   - Waits for running jobs to complete (graceful shutdown)
   - Terminates the worker process
   - Closes backend connections

2. **Dashboard Shutdown**
   - Stops the Express server
   - Closes HTTP connections
   - Cleans up dashboard resources

3. **Resource Cleanup**
   - Clears backend references from job and queue operations
   - Resets internal state for potential restart

## Restart Capability

After stopping Sidequest, you can start it again with new configuration:

```typescript
// Stop the current instance
await Sidequest.stop();

// Start with new configuration
await Sidequest.start(newConfig);
```

This is useful for:

- Configuration changes
- Backend switching
- Development workflows
- Graceful deployment updates

## Monitoring Startup

Monitor the startup process using logs:

```typescript
await Sidequest.start({
  logger: {
    level: "debug", // Shows detailed startup logs
  },
});

// Look for these log messages:
// "Configuring Sidequest engine"
// "Starting Sidequest using backend @sidequest/postgres-backend"
// "Starting main worker..."
// "Main worker is ready"
// "Server running on http://localhost:8678"
```

## Next Steps

Once Sidequest is running:

- **[Enqueue Jobs](/engine/enqueue)** - Start processing jobs
- **[Monitor with Dashboard](/dashboard)** - View job status and manage queues
- **[Configure Graceful Shutdown](/engine/graceful-shutdown)** - Handle application lifecycle
