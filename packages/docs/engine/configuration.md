---
outline: deep
title: Engine Configuration
description: Engine configuration guide for Sidequest.js
---

# Engine Configuration

```typescript
// app.js
import { Sidequest } from "sidequest";

// Quick start Sidequest with default settings and Dashboard enabled
await Sidequest.start();

// Or if you would like to configure it with custom settings
await Sidequest.start({
  // Defaults to SQLite backend if not set
  // You should install the backend driver you want to use
  backend: {
    driver: "@sidequest/postgres-backend",
    config: "postgresql://postgres:postgres@localhost:5432/postgres",
  },
  // Queues are created automatically with default settings
  // if none is defined
  queues: [
    { name: "default", concurrency: 2, priority: 50 },
    { name: "critical", concurrency: 5, priority: 100 },
    { name: "reports", concurrency: 1, state: "paused" },
  ],
  // Maximum number of concurrent jobs across all queues
  maxConcurrentJobs: 100,
  // Dashboard-specific configs
  dashboard: {
    // Enable or disable the dashboard
    enabled: true,
    // Port for the dashboard
    port: 8678,
    // Authentication for the dashboard
    auth: {
      user: "admin",
      password: "secret",
    },
  },
});

console.log("Sidequest started! Dashboard: http://localhost:8678");
```
