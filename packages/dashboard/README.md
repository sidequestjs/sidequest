# @sidequest/dashboard

Web-based monitoring and management dashboard for the [Sidequest](https://github.com/sidequestjs/sidequest) job processing system.

## Summary

This package provides a beautiful, responsive web dashboard for monitoring and managing your Sidequest job queues. Built with Express.js, EJS templating, and HTMX for dynamic interactions, the dashboard offers real-time insights into your job processing system without requiring external dependencies or complex setup.

The dashboard includes:

- **Real-time Job Statistics** - Live counters and charts showing job states and performance
- **Job Management** - View, filter, search, retry, and cancel jobs
- **Queue Operations** - Monitor queue status, pause/resume processing, and manage priorities
- **Performance Analytics** - Charts and metrics for job throughput and processing times
- **Responsive Design** - Modern, mobile-friendly interface using DaisyUI and TailwindCSS
- **Optional Authentication** - Basic auth protection for production deployments
- **HTMX Integration** - Dynamic updates without full page reloads

The dashboard is designed to work seamlessly with all Sidequest backends (PostgreSQL, MySQL, SQLite, MongoDB) and automatically connects to your existing job queue infrastructure.

## Documentation

For complete setup instructions, configuration options, and usage guides, visit:

**[https://docs.sidequestjs.com/dashboard](https://docs.sidequestjs.com/dashboard)**

The documentation covers:

- **Getting Started** - Quick setup and first run
- **Configuration Options** - Backend setup, authentication, and customization
- **Feature Overview** - Detailed walkthrough of all dashboard features
- **Production Deployment** - Security considerations and deployment best practices
- **Troubleshooting** - Common issues and solutions
- **API Reference** - Integration options and programmatic access

### Quick Start

The dashboard is available through the Sidequest regular configuration and is started alongside the Sidequest engine:

```typescript
import { Sidequest } from "sidequest";

await Sidequest.start({
  backend: {
    driver: "@sidequest/postgres-backend",
    config: "postgresql://localhost:5432/sidequest",
  },
  dashboard: {
    enabled: true,
    port: 8678,
    auth: {
      user: "admin",
      password: "secure-password",
    },
  },
  queues: [{ name: "default", priority: 10, workers: 2 }],
});

// Dashboard available at http://localhost:8678
```

If you prefer to use only the dashboard without starting the Sidequest engine, you can do so by importing and configuring it directly:

```typescript
import { SidequestDashboard } from "@sidequest/dashboard";

const dashboard = new SidequestDashboard();

await dashboard.start({
  enabled: true,
  port: 8678,
  backendConfig: {
    driver: "@sidequest/postgres-backend",
    config: "postgresql://localhost:5432/sidequest",
  },
  auth: {
    user: "admin",
    password: "secure-password",
  },
});

// Dashboard available at http://localhost:8678
```

### Reverse Proxy Setup

When deploying behind a reverse proxy, use the `basePath` option:

```typescript
await Sidequest.start({
  dashboard: {
    port: 8678,
    basePath: "/admin/sidequest", // Serve at /admin/sidequest
    auth: {
      user: "admin",
      password: "secure-password",
    },
  },
});
```

Then configure your reverse proxy to forward requests:

```nginx
# Nginx example
location /admin/sidequest/ {
  proxy_pass http://localhost:8678/admin/sidequest/;
}
```

## License

LGPL-3.0-or-later
