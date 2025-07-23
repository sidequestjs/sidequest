---
outline: deep 
title: Engine Configuration 
description: How to configure the Sidequest engine, queues, backends, and dashboard
---

# Engine Configuration

Sidequest.js is designed to be flexible and cloud-agnostic. You can start it instantly with sane defaults, or configure every aspect for your use case by choosing backend, queues, concurrency, and dashboard options.

## 1. Basic Startup

The simplest way to start Sidequest is with all the default settings. This automatically uses the SQLite backend and enables the dashboard.

```typescript
import { Sidequest } from "sidequest";

await Sidequest.start();

console.log("Sidequest started! Dashboard: http://localhost:8678");
```

::: warning
Remember to install `@sidequest/sqlite-backend` before running with the default settings, or make sure to install the appropriate backend driver for your setup.
:::

## 2. Custom Configuration

You can fully customize how Sidequest runs in your application. You can choose your backend, define queues, set concurrency limits, and configure the dashboard.

```typescript
import { Sidequest } from "sidequest";

await Sidequest.start({
  // 1. Backend: choose your preferred database
  backend: {
    driver: "@sidequest/postgres-backend", // or @sidequest/sqlite-backend, @sidequest/mysql-backend, @sidequest/redis-backend, etc.
    config: "postgresql://postgres:postgres@localhost:5432/postgres",
  },
  // 2. Queues: define queue names, priorities, concurrency, and initial state
  queues: [
    { name: "default", concurrency: 2, priority: 50 },
    { name: "critical", concurrency: 5, priority: 100 },
    { name: "reports", concurrency: 1 },
  ],
  // 3. Maximum concurrent jobs (across all queues)
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

### Configuration Options

| Option              | Description                                                                                 | Default                              |
| ------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------ |
| `backend`           | Which backend driver and config string to use (SQLite, Postgres, MySQL, Redis, MongoDB)     | SQLite (`@sidequest/sqlite-backend`) |
| `queues`            | Array of queue configs. Name, concurrency, priority, initial state (`waiting` or `paused`)  | `[]`                                 |
| `maxConcurrentJobs` | Maximum number of jobs processed at the same time across all queues                         | `100`                                |
| `dashboard.enabled` | Enable or disable the dashboard UI                                                          | `true`                               |
| `dashboard.port`    | Port where the dashboard runs                                                               | `8678`                               |
| `dashboard.auth`    | Basic authentication (user/password) for dashboard access. If omitted, no auth is required. | not set (no auth)                    |

::: danger
If `auth` is not configured and `dashboard: true` is enabled in production, the dashboard will be publicly accessible. This is a security risk and **not recommended**.
:::

::: warning
If you enqueue a job to a queue that does not exist yet, Sidequest will automatically create the queue using default settings: `status: active`, `priority: 0`, and `concurrency: 10`. You can later adjust these settings if needed.
:::

## 3. Switching Backends

You can run Sidequest on any supported backend. Supported backends include Postgres, SQLite, MySQL, Redis, and soon MongoDB. Install the corresponding driver and provide the config string.

**Example: Using PostgreSQL backend**

```typescript
backend: {
  driver: "@sidequest/postgres-backend",
  config: "postgresql://postgres:postgres@localhost:5432/postgres",
}
```

**Example: Using Redis backend**

```typescript
backend: {
  driver: "@sidequest/redis-backend",
  config: "redis://localhost:6379",
}
```

**See:** [Installation Guide](/installation#choose-your-backend) for details on installing drivers.


## 4. Full Example

::: code-group

```typescript [TypeScript]
import { Sidequest } from "sidequest";

await Sidequest.start({
  backend: {
    driver: "@sidequest/postgres-backend",
    config: "postgresql://postgres:postgres@localhost:5432/postgres",
  },
  queues: [
    { name: "default", concurrency: 2, priority: 50 },
    { name: "critical", concurrency: 5, priority: 100 },
    { name: "reports", concurrency: 1, state: "paused" },
  ],
  maxConcurrentJobs: 100,
  dashboard: {
    enabled: true,
    port: 8678,
    auth: {
      user: "admin",
      password: "secret",
    },
  },
});

console.log("Sidequest started! Dashboard: http://localhost:8678");
```

```typescript [ESM]
import { Sidequest } from "sidequest";

await Sidequest.start({
  backend: {
    driver: "@sidequest/postgres-backend",
    config: "postgresql://postgres:postgres@localhost:5432/postgres",
  },
  queues: [
    { name: "default", concurrency: 2, priority: 50 },
    { name: "critical", concurrency: 5, priority: 100 },
    { name: "reports", concurrency: 1, state: "paused" },
  ],
  maxConcurrentJobs: 100,
  dashboard: {
    enabled: true,
    port: 8678,
    auth: {
      user: "admin",
      password: "secret",
    },
  },
});

console.log("Sidequest started! Dashboard: http://localhost:8678");
```

```javascript [CommonJS]
const { Sidequest } = require("sidequest");

Sidequest.start({
  backend: {
    driver: "@sidequest/postgres-backend",
    config: "postgresql://postgres:postgres@localhost:5432/postgres",
  },
  queues: [
    { name: "default", concurrency: 2, priority: 50 },
    { name: "critical", concurrency: 5, priority: 100 },
    { name: "reports", concurrency: 1, state: "paused" },
  ],
  maxConcurrentJobs: 100,
  dashboard: {
    enabled: true,
    port: 8678,
    auth: {
      user: "admin",
      password: "secret",
    },
  },
}).then(() => {
  console.log("Sidequest started! Dashboard: http://localhost:8678");
});
```

:::

---

## Next Steps

- [Enqueueing Jobs](/engine/enqueue)
- [Job Class Reference](/jobs/index)
- [Monitoring Jobs with the Dashboard](/dashboard)

