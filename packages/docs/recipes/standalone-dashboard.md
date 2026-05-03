---
title: Standalone Dashboard
description: Running the Sidequest dashboard as a separate process, separate from your worker.
---

# Standalone Dashboard

By default, the dashboard runs embedded in the same process that starts Sidequest. For production, you may want to run it separately so that:

- Dashboard traffic doesn't interfere with job processing.
- You can deploy the dashboard behind a VPN or auth proxy without exposing it publicly.
- You can restart the worker without taking down the dashboard (and vice versa).

## Using SidequestDashboard directly

The `@sidequest/dashboard` package exports `SidequestDashboard`, which connects to the database directly (no worker needed):

```typescript
// dashboard.ts
import { SidequestDashboard } from "sidequest"; // or from "@sidequest/dashboard"

const dashboard = new SidequestDashboard();

await dashboard.start({
  enabled: true,
  port: 8678,
  backendConfig: {
    driver: "@sidequest/postgres-backend",
    config: process.env.DATABASE_URL,
  },
  auth: {
    user: process.env.DASHBOARD_USER!,
    password: process.env.DASHBOARD_PASSWORD!,
  },
});

console.log("Dashboard: http://localhost:8678");

process.on("SIGTERM", async () => {
  await dashboard.close();
  process.exit(0);
});
```

Run this as a separate process from your worker:

```bash
node dist/dashboard.js   # standalone dashboard
node dist/worker.js      # job processor
```

## Disabling the embedded dashboard on your worker

When running a standalone dashboard, turn off the embedded one:

```typescript
// worker.ts
await Sidequest.start({
  backend: { driver: "@sidequest/postgres-backend", config: process.env.DATABASE_URL },
  dashboard: { enabled: false }, // dashboard runs elsewhere
});
```

## Web server only (enqueue-only instance)

If you have a web server that only enqueues jobs and never processes them, use `Sidequest.configure()` — it sets up the backend connection without starting workers or the dashboard:

```typescript
// server.ts (HTTP server — enqueue only)
import { Sidequest } from "sidequest";

await Sidequest.configure({
  backend: { driver: "@sidequest/postgres-backend", config: process.env.DATABASE_URL },
});

// Now you can enqueue from route handlers
app.post("/send-email", async (req, res) => {
  await Sidequest.build(SendEmailJob).enqueue(req.body.to, req.body.subject);
  res.json({ ok: true });
});
```

See [Deployment](/production/deployment) for a full topology guide.
