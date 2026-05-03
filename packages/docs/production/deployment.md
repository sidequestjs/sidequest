---
title: Deployment Guide
description: Running Sidequest in production — worker processes, environment variables, process management, and multi-instance considerations.
---

# Deployment Guide

## Choose a deployment topology

Sidequest can run in two arrangements:

**Embedded** — the job engine starts inside the same process as your web server. Simple to deploy, but your web server's lifecycle controls the worker pool too. Fine for low-volume workloads where you don't need independent scaling.

```typescript
// server.ts
import { Sidequest } from "sidequest";
import express from "express";

await Sidequest.start({ backend: { driver: "@sidequest/postgres-backend", config: process.env.DATABASE_URL } });
const app = express();
// ...
app.listen(3000);
```

**Separate worker process** — run a dedicated `worker.ts` process alongside your web server. The web server calls `Sidequest.configure()` (no workers), the worker calls `Sidequest.start()`. This lets you scale and restart them independently.

```typescript
// worker.ts
import { Sidequest } from "sidequest";

await Sidequest.start({
  backend: { driver: "@sidequest/postgres-backend", config: process.env.DATABASE_URL },
  dashboard: { enabled: true, port: 8678, auth: { user: process.env.DASHBOARD_USER!, password: process.env.DASHBOARD_PASSWORD! } },
});
```

```typescript
// server.ts (web server — enqueues only, no workers)
import { Sidequest } from "sidequest";

await Sidequest.configure({
  backend: { driver: "@sidequest/postgres-backend", config: process.env.DATABASE_URL },
});
```

The separate-worker topology is recommended for production: it keeps HTTP response times unaffected by worker load, and allows independent deploys.

## Environment variables

Never hardcode credentials. Pass configuration at runtime:

```typescript
await Sidequest.start({
  backend: {
    driver: "@sidequest/postgres-backend",
    config: process.env.DATABASE_URL,
  },
  dashboard: {
    enabled: process.env.DASHBOARD_ENABLED !== "false",
    port: parseInt(process.env.DASHBOARD_PORT ?? "8678"),
    auth: {
      user: process.env.DASHBOARD_USER!,
      password: process.env.DASHBOARD_PASSWORD!,
    },
  },
  logger: {
    level: process.env.LOG_LEVEL ?? "info",
    json: process.env.NODE_ENV === "production",
  },
});
```

## Process management

### PM2

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    { name: "web", script: "./dist/server.js" },
    { name: "worker", script: "./dist/worker.js", autorestart: true, watch: false },
  ],
};
```

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### systemd

```ini
# /etc/systemd/system/myapp-worker.service
[Unit]
Description=Sidequest worker
After=network.target

[Service]
Type=simple
User=myapp
WorkingDirectory=/opt/myapp
ExecStart=/usr/bin/node dist/worker.js
Restart=always
RestartSec=5
EnvironmentFile=/opt/myapp/.env

[Install]
WantedBy=multi-user.target
```

```bash
systemctl enable myapp-worker
systemctl start myapp-worker
```

### Docker

```dockerfile
# Dockerfile.worker
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY dist ./dist
CMD ["node", "dist/worker.js"]
```

```yaml
# docker-compose.yml (excerpt)
services:
  web:
    build: .
    command: node dist/server.js
  worker:
    build:
      context: .
      dockerfile: Dockerfile.worker
    environment:
      DATABASE_URL: ${DATABASE_URL}
      DASHBOARD_USER: ${DASHBOARD_USER}
      DASHBOARD_PASSWORD: ${DASHBOARD_PASSWORD}
    restart: always
```

## Multi-instance deployments

Running multiple worker processes against the same database is safe — the SQL backends use `SELECT ... FOR UPDATE SKIP LOCKED` to atomically claim jobs without double-issuing.

One concern: **cron schedules are in-memory only**. If you call `Sidequest.build(ReportJob).schedule("0 9 * * *", ...)` in your worker startup, every instance will schedule the same job independently. On a two-instance deployment, the report runs twice.

Prevent this with `unique()`:

```typescript
await Sidequest.build(DailyReportJob)
  .unique({ period: "day" })
  .schedule("0 9 * * *");
```

With `unique({ period: "day" })`, only one job per day is created regardless of how many instances try to enqueue it.

## Dashboard security

::: danger
If `auth` is not set, the dashboard is publicly accessible. Anyone who can reach the port can cancel, requeue, and inspect all jobs.
:::

Always configure auth in production:

```typescript
dashboard: {
  enabled: true,
  port: 8678,
  auth: {
    user: process.env.DASHBOARD_USER!,
    password: process.env.DASHBOARD_PASSWORD!,
  },
}
```

Or put the dashboard behind a VPN or reverse proxy with authentication, and set `dashboard.enabled: false` on your public-facing process.

## Database connection limits

Sidequest opens its own connection pool to the database. If your web server and worker both share the same Postgres instance, you're running two pools. Set `backend.config` to a Knex config object with an explicit pool size to avoid exhausting connections:

```typescript
backend: {
  driver: "@sidequest/postgres-backend",
  config: {
    connection: process.env.DATABASE_URL,
    pool: { min: 2, max: 5 }, // don't exhaust the DB connection limit
  },
},
```

For a 25-connection Postgres plan, a reasonable split is web server: max 15, worker: max 5, leaving headroom for migrations and admin queries.

## Health checks

Sidequest does not expose an HTTP health endpoint by default. For container orchestration, check that the process is alive and the database is reachable:

```typescript
// healthcheck.ts
import { Sidequest } from "sidequest";

try {
  await Sidequest.configure({ backend: { driver: "@sidequest/postgres-backend", config: process.env.DATABASE_URL } });
  const jobs = await Sidequest.job.count();
  console.log("OK", jobs);
  process.exit(0);
} catch (e) {
  console.error("FAIL", e);
  process.exit(1);
}
```

## Graceful shutdown

Sidequest handles `SIGTERM` / `SIGINT` automatically when `gracefulShutdown: true` (the default). On the first signal it stops claiming new jobs and waits for running ones to finish. A second signal forces an immediate exit.

Make sure your process manager sends `SIGTERM` (not `SIGKILL`) and gives the process enough time to drain. A 30-second drain window is a safe default for most workloads.

See [Graceful Shutdown](/production/graceful-shutdown) for full details and stale job recovery.
