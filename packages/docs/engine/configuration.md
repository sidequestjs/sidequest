---
outline: deep
title: Engine Configuration
description: How to configure the Sidequest engine, queues, backends, and dashboard
---

# Engine Configuration

Sidequest.js is designed to be flexible and cloud-agnostic. You can start it instantly with sane defaults, or configure every aspect for your use case by choosing backend, queues, concurrency, and dashboard options.

## 1. Basic Startup

The simplest way to configure and start Sidequest is with all the default settings. This automatically uses the SQLite backend and enables the dashboard.

```typescript
import { Sidequest } from "sidequest";

await Sidequest.start();

console.log("Sidequest started! Dashboard: http://localhost:8678");
```

::: warning
Remember to install `@sidequest/sqlite-backend` before running with the default settings, or make sure to install the appropriate backend driver for your setup.
:::

## 2. Partial Startup

If you prefer NOT to start Sidequest, but merely configure it allowing job enqueueing, you can use the `Sidequest.configure` method. This allows you to set up the engine without starting it immediately (i.e., no worker will process jobs).

```typescript
import { Sidequest } from "sidequest";

await Sidequest.configure({
  backend: {
    driver: "@sidequest/sqlite-backend",
    config: "./sidequest.sqlite",
  },
  queues: [
    { name: "default", concurrency: 2, priority: 50, state: "active" },
    { name: "critical", concurrency: 5, priority: 100, state: "active" },
  ],
});
console.log("Sidequest configured but not started yet.");
```

::: tip
If you use `Sidequest.configure`, you can then enqueue jobs without starting the engine. This is useful if you want to enable this instance to only enqueue jobs, but not necessarily process them, e.g., in a web server context where you want to enqueue jobs from HTTP requests without starting workers.
:::

## 3. Custom Configuration

You can fully customize how Sidequest runs in your application. The configuration options are organized into several categories:

- **Backend**: Database connection and driver settings
- **Queues**: Initial queue definitions and default queue behavior
- **Job Processing**: Concurrency, threading, and job execution settings
- **Maintenance**: Automatic cleanup and stale job handling
- **Logging**: Log level and output format configuration
- **Job Defaults**: Default settings applied to all new jobs
- **Dashboard**: Web interface configuration and authentication

### Basic Custom Configuration

Here's a basic custom configuration example:

```typescript
import { Sidequest } from "sidequest";

await Sidequest.start({
  // 1. Backend: choose your preferred database
  backend: {
    driver: "@sidequest/postgres-backend", // or @sidequest/sqlite-backend, @sidequest/mysql-backend, etc.
    config: "postgresql://postgres:postgres@localhost:5432/postgres",
  },

  // 2. Queues: define queue names, priorities, concurrency, and initial state
  queues: [
    { name: "default", concurrency: 2, priority: 50, state: "active" },
    { name: "critical", concurrency: 5, priority: 100, state: "active" },
    { name: "reports", concurrency: 1, state: "paused" },
  ],

  // 3. Job processing configuration
  maxConcurrentJobs: 50,

  // 4. Dashboard: enable/disable, set port, and basic auth
  dashboard: {
    enabled: true,
    port: 8678,
    auth: {
      user: "admin",
      password: "secret",
    },
  },
});
```

### Complete Configuration Example

For advanced use cases, here's a comprehensive configuration showing all available options:

```typescript
import { Sidequest } from "sidequest";

await Sidequest.start({
  // 1. Backend: choose your preferred database
  backend: {
    driver: "@sidequest/postgres-backend", // or @sidequest/sqlite-backend, @sidequest/mysql-backend, etc.
    config: "postgresql://postgres:postgres@localhost:5432/postgres",
  },

  // 2. Queues: define queue names, priorities, concurrency, and initial state
  queues: [
    { name: "default", concurrency: 2, priority: 50, state: "active" },
    { name: "critical", concurrency: 5, priority: 100, state: "active" },
    { name: "reports", concurrency: 1, state: "paused" },
  ],

  // 3. Job processing configuration
  maxConcurrentJobs: 50,
  minThreads: 4,
  maxThreads: 8,
  idleWorkerTimeout: 10000, // 10 seconds

  // 4. Migration and startup
  skipMigration: false,

  // 5. Job maintenance and cleanup
  releaseStaleJobsIntervalMin: 60,
  releaseStaleJobsMaxStaleMs: 10 * 60 * 1000, // 10 minutes
  releaseStaleJobsMaxClaimedMs: 1 * 60 * 1000, // 1 minute
  cleanupFinishedJobsIntervalMin: 60,
  cleanupFinishedJobsOlderThan: 30 * 24 * 60 * 60 * 1000, // 30 days

  // 6. Logging configuration
  logger: {
    level: "info", // 'debug', 'info', 'warn', 'error'
    json: false,
  },

  // 7. Shutdown behavior
  gracefulShutdown: true,

  // 8. Default job configuration
  jobDefaults: {
    queue: "default",
    timeout: 30000, // 30 seconds
    maxAttempts: 3,
    availableAt: new Date(), // immediate
    uniqueness: false,
  },

  // 9. Default queue configuration
  queueDefaults: {
    concurrency: 10,
    priority: 0,
    state: "active",
  },

  // 10. Dashboard: enable/disable, set port, and basic auth
  dashboard: {
    enabled: true,
    port: 8678,
    auth: {
      user: "admin",
      password: "secret",
    },
  },

  // 11. Job resolution
  manualJobResolution: false,
  jobsFilePath: "sidequest.jobs.js",

  // 12. Job polling interval
  jobPollingInterval: 100, // 100 milliseconds
});
```

### Configuration Options

| Option                           | Description                                                                                                                       | Default                     |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| `backend.driver`                 | Backend driver package name (SQLite, Postgres, MySQL, MongoDB)                                                                    | `@sidequest/sqlite-backend` |
| `backend.config`                 | Backend-specific connection string or [Knex configuration object](https://knexjs.org/guide/#configuration-options)                | `./sidequest.sqlite`        |
| `dashboard.enabled`              | Whether to enable the dashboard web interface                                                                                     | `true`                      |
| `dashboard.port`                 | Port for the dashboard web interface                                                                                              | `8678`                      |
| `dashboard.auth`                 | Basic auth configuration with `user` and `password`. If omitted, no auth is required.                                             | `undefined`                 |
| `queues`                         | Array of queue configurations with name, concurrency, priority, and state                                                         | `[]`                        |
| `maxConcurrentJobs`              | Maximum number of jobs processed simultaneously across all queues                                                                 | `10`                        |
| `minThreads`                     | Minimum number of worker threads to use                                                                                           | Number of CPU cores         |
| `maxThreads`                     | Maximum number of worker threads to use                                                                                           | `minThreads * 2`            |
| `idleWorkerTimeout`              | Timeout (milliseconds) for idle workers before they are terminated                                                                | `10000` (10 seconds)        |
| `skipMigration`                  | Whether to skip database migration on startup                                                                                     | `false`                     |
| `releaseStaleJobsIntervalMin`    | Frequency (minutes) for releasing stale jobs. Set to `false` to disable                                                           | `60`                        |
| `releaseStaleJobsMaxStaleMs`     | Maximum age (milliseconds) for a running job to be considered stale                                                               | `600000` (10 minutes)       |
| `releaseStaleJobsMaxClaimedMs`   | Maximum age (milliseconds) for a claimed job to be considered stale                                                               | `60000` (1 minute)          |
| `cleanupFinishedJobsIntervalMin` | Frequency (minutes) for cleaning up finished jobs. Set to `false` to disable                                                      | `60`                        |
| `cleanupFinishedJobsOlderThan`   | Age (milliseconds) after which finished jobs are deleted                                                                          | `2592000000` (30 days)      |
| `logger.level`                   | Minimum log level (`debug`, `info`, `warn`, `error`)                                                                              | `info`                      |
| `logger.json`                    | Whether to output logs in JSON format                                                                                             | `false`                     |
| `gracefulShutdown`               | Whether to enable graceful shutdown handling                                                                                      | `true`                      |
| `jobDefaults`                    | Default values for new jobs. Used while enqueueing                                                                                | `undefined`                 |
| `queueDefaults`                  | Default values for auto-created queues                                                                                            | `undefined`                 |
| `manualJobResolution`            | Whether to manually resolve job classes. See [Manual Job Resolution](/jobs/manual-resolution.md)                                  | `false`                     |
| `jobsFilePath`                   | Optional path to the file where job classes are exported. Ignored if `manualJobResolution` is `false`.                            | `undefined`                 |
| `jobPollingInterval`             | Interval (milliseconds) for polling new jobs to process. Increase this number to reduce DB load at the cost of job start latency. | `100` (100 milliseconds)    |

::: danger
If `auth` is not configured and `dashboard: true` is enabled in production, the dashboard will be publicly accessible. This is a security risk and **not recommended**.
:::

::: warning
If you enqueue a job to a queue that does not exist yet, Sidequest will automatically create the queue using default settings: `status: active`, `priority: 0`, and `concurrency: 10`. You can later adjust these settings if needed.
:::

## 4. Switching Backends

You can run Sidequest on any supported backend. Supported backends include Postgres, SQLite, MySQL, and soon MongoDB. Install the corresponding driver and provide the config string.

**See:** [Installation Guide](/installation#choose-your-backend) for details on installing drivers.

### Using PostgreSQL backend

```typescript
backend: {
  driver: "@sidequest/postgres-backend",
  config: "postgresql://postgres:postgres@localhost:5432/postgres",
}
```

### Using MySQL backend

```typescript
backend: {
  driver: "@sidequest/mysql-backend",
  config: "mysql://root:mysql@localhost:3306/testdb",
}
```

## 5. Configuration Reference

The comprehensive configuration example above demonstrates all available options. In practice, you typically only need to configure the options relevant to your use case. Here are some common configuration patterns:

::: code-group

```typescript [Production Setup]
import { Sidequest } from "sidequest";

await Sidequest.start({
  backend: {
    driver: "@sidequest/postgres-backend",
    config: process.env.DATABASE_URL,
  },
  queues: [
    { name: "default", concurrency: 5, priority: 50 },
    { name: "critical", concurrency: 10, priority: 100 },
    { name: "emails", concurrency: 2, priority: 30 },
  ],
  maxConcurrentJobs: 20,
  logger: {
    level: "info",
    json: true, // Structured logging for production
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

```typescript [Development Setup]
import { Sidequest } from "sidequest";

await Sidequest.start({
  logger: {
    level: "debug", // Verbose logging for development
    json: false,
  },
  dashboard: {
    enabled: true,
    port: 3000,
    // No auth for local development
  },
  // Use default SQLite backend for easy setup
});
```

```typescript [High-Throughput Setup]
import { Sidequest } from "sidequest";

await Sidequest.start({
  backend: {
    driver: "@sidequest/postgres-backend",
    config: "postgresql://postgres:postgres@localhost:5432/postgres",
  },
  maxConcurrentJobs: 100,
  minThreads: 8,
  maxThreads: 16,
  idleWorkerTimeout: 30000, // 30 seconds for high throughput
  releaseStaleJobsIntervalMin: 30, // More frequent stale job cleanup
  cleanupFinishedJobsIntervalMin: 30, // More frequent cleanup
  queueDefaults: {
    concurrency: 20, // Higher default concurrency
  },
  jobPollingInterval: 50, // Faster job polling - every 50ms
});
```

:::

---

## Next Steps

- [Enqueueing Jobs](/engine/enqueue)
- [Job Class Reference](/jobs/index)
- [Monitoring Jobs with the Dashboard](/dashboard)
