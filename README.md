# Sidequest

[![NPM Version](https://img.shields.io/npm/v/sidequest.svg)](https://www.npmjs.com/package/sidequest)
[![License](https://img.shields.io/badge/license-LGPL--3.0--or--later-blue.svg)](LICENSE.md)
![Build Status](https://github.com/sidequestjs/sidequest-private/actions/workflows/pull-request.yml/badge.svg?branch=master)
[![TypeScript](https://img.shields.io/badge/language-typescript-blue.svg)](https://www.typescriptlang.org/)
![Node.js Version](https://img.shields.io/node/v/sidequest.svg)
[![Docs](https://img.shields.io/badge/docs-available-blue.svg)](https://docs.sidequestjs.com)

![Sidequest.js Logo](./packages/docs/public/logo.png "Sidequest.js Logo")

**Sidequest** is a modern, scalable background job processor for Node.js applications. Built with TypeScript and designed for production use, it provides reliable job processing with multiple database backends, a beautiful web dashboard, and comprehensive monitoring capabilities.

## 📚 Table of Contents

- [Sidequest](#sidequest)
  - [📚 Table of Contents](#-table-of-contents)
  - [✨ Features](#-features)
  - [📦 Installation](#-installation)
  - [⚙️ Usage](#️-usage)
    - [1. Create a Job class](#1-create-a-job-class)
    - [2. Configure and Start Sidequest](#2-configure-and-start-sidequest)
    - [3. Enqueue Jobs](#3-enqueue-jobs)
    - [4. Watch the Magic Happen](#4-watch-the-magic-happen)
  - [🛠️ CLI Usage](#️-cli-usage)
    - [CLI Configuration](#cli-configuration)
  - [📊 Monitoring and Observability](#-monitoring-and-observability)
    - [Job Lifecycle](#job-lifecycle)
    - [Logging](#logging)
    - [Graceful Shutdown \& Stale Job Recovery](#graceful-shutdown--stale-job-recovery)
  - [🔌 Integration Examples](#-integration-examples)
    - [Express.js Integration](#expressjs-integration)
  - [🏃‍♂️ Development](#️-development)
    - [Prerequisites](#prerequisites)
    - [Architecture](#architecture)
    - [Setup](#setup)
  - [🤝 Contributing](#-contributing)
  - [📄 License](#-license)
  - [🆘 Support](#-support)

## ✨ Features

- 🚀 **High Performance** - Worker threads for non-blocking job processing
- 🗄️ **Multiple Backends** - SQLite, PostgreSQL, MySQL support out of the box
- ✅ **ESM and CJS support** - Fully compatible with modern JavaScript
- 📝 **Support for Typescript** - Supports TypeScript jobs by default if you are using [Node.js >= 24](https://nodejs.org/api/typescript.html#modules-typescript)
- 📊 **Web Dashboard** - Beautiful, responsive dashboard for monitoring jobs and queues
- 🎯 **Queue Management** - Multiple queues with configurable workers and priorities
- 🫀 **Job Lifecycle Management** - Configurable retry with exponential backoff, snooze, and fail mechanisms
- ⏰ **Scheduled Jobs** - Support for scheduling jobs to run at specific times
- 🔒 **Job Uniqueness** - Prevent duplicate jobs with flexible uniqueness constraints
- 🛠️ **CLI Tools** - Command-line interface for database migrations and management
- 🏗️ **Monorepo Architecture** - Modular packages for flexible deployment

## 📦 Installation

To get started with Sidequest, first install the main package:

```bash
npm install sidequest
# or
yarn add sidequest
```

To keep the application minimal, the main package does _not_ include the backend drivers. Thus you need to install only the driver you will use:

**PostgreSQL (recommended)**

```bash
npm install @sidequest/postgres-backend
# or
yarn add @sidequest/postgres-backend
```

<details>
  <summary>SQLite (default - not recommended for production)</summary>

```bash
npm install @sidequest/sqlite-backend
# or
yarn add @sidequest/sqlite-backend
```

</details>

<details>
  <summary>MySQL</summary>
  
```bash
npm install @sidequest/mysql-backend
# or
yarn add @sidequest/mysql-backend
```
</details>

<br />

We also provide an optional CLI Tool to manage backend migrations and configurations. You can install it globally:

```bash
npm install -g @sidequest/cli
# or
yarn global add @sidequest/cli
```

## ⚙️ Usage

### 1. Create a Job class

```typescript
// jobs/EmailJob.js
import { Job } from "sidequest";

export class EmailJob extends Job {
  async run(to, subject, body) {
    console.log(`Sending email to ${to}: ${subject}`);
    // Your email sending logic here
    return { sent: true, timestamp: new Date() };
  }
}
```

### 2. Configure and Start Sidequest

```typescript
// app.js
import { Sidequest } from "sidequest";

// Quick start Sidequest with default settings an Dashboard enabled
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

### 3. Enqueue Jobs

```typescript
// Somewhere in your application
import { Sidequest } from "sidequest";
import { EmailJob } from "./jobs/EmailJob.js";

// Simple job
await Sidequest.build(EmailJob).enqueue("user@example.com", "Welcome!", "Thanks for signing up!");

// Build a Job with options
await Sidequest.build(EmailJob)
  // If the queue does not exist, it will be created automatically
  .queue("emails")
  // Timeout after 30 seconds
  .timeout(30000)
  // Prevent duplicate jobs
  .unique()
  // Retry up to 5 times in case of failures
  .maxAttempts(5)
  // Available for running at a specific date and time
  .availableAt(new Date(2025, 7, 17))
  // Magically typed if EmailJob is written in TypeScript
  .enqueue("user@example.com", "Weekly Report", "Your weekly summary...");
```

### 4. Watch the Magic Happen

Access the Sidequest dashboard at `http://localhost:8678` to monitor your jobs and queues.

Features:

- Real-time job statistics
- Job filtering and search
- Queue management (pause/resume)
- Job retry and cancellation
- Performance charts
- Responsive design

## 🛠️ CLI Usage

Sidequest includes a CLI for database migrations and management:

```bash
# Install CLI globally
npm install -g @sidequest/cli

# Configure connection
sidequest config

# Run migrations
sidequest migrate

# Rollback migrations
sidequest rollback
```

### CLI Configuration

`sidequest config` will create a `.sidequest.config.json` file, e.g.:

```json
{
  "backend": "@sidequest/postgres-backend",
  "connection": {
    "type": "env",
    "varName": "DATABASE_URL"
  }
}
```

## 📊 Monitoring and Observability

### Job Lifecycle

Jobs in Sidequest go through the following states:

- `waiting` - Job is queued and waiting to be processed
- `claimed` - Job has been claimed by a worker
- `running` - Job is currently being processed
- `completed` - Job finished successfully
- `failed` - Job failed and won't be retried
- `canceled` - Job was manually canceled

### Logging

Sidequest uses Winston for structured logging. You can also use the logger in your jobs to log messages:

```typescript
import { Job, logger } from "sidequest";

// In your job
export class MyJob extends Job {
  run(data) {
    logger().info("Processing job", { data });
    // ... job logic
    logger().info("Job completed successfully");
    return { success: true, timestamp: new Date() };
  }
}
```

### Graceful Shutdown & Stale Job Recovery

When your application receives a `SIGINT` or `SIGTERM` signal, Sidequest initiates a graceful shutdown: it waits for all currently running jobs to complete before exiting. This helps prevent data loss and ensures that tasks finish cleanly.

If a second termination signal is received before all jobs finish, Sidequest will immediately abort all running jobs and stop. In this situation, jobs in the `claimed` or `running` state may be interrupted before the engine can update their status to `completed` or `failed`. As a result, upon restart, Sidequest may incorrectly believe those jobs are still owned by a worker, leaving them in a stale state and blocking their execution.

To address this, Sidequest automatically detects and releases stale jobs while running. If a job remains in the `running` state after its timeout period has expired, Sidequest considers it stale and returns it to the queue for retry by another worker. This ensures reliable job recovery after forceful shutdowns or unexpected interruptions, keeping your task queues healthy and preventing jobs from becoming permanently stuck.

## 🔌 Integration Examples

### Express.js Integration

```typescript
import express from "express";
import { Sidequest } from "sidequest";
import { EmailJob } from "./jobs/EmailJob.js";

const app = express();

app.post("/send-email", async (req, res) => {
  const { to, subject, body } = req.body;

  const job = await Sidequest.build(EmailJob).queue("emails").enqueue(to, subject, body);

  res.json({ jobId: job.id, message: "Email queued successfully" });
});

await Sidequest.start();

app.listen(3000);
```

## 🏃‍♂️ Development

### Prerequisites

- Node.js 22.6.0+
- Yarn 4.x (with Corepack)

### Architecture

Sidequest is built as a monorepo with the following packages:

- **`sidequest`** - Main package combining all components
- **`@sidequest/core`** - Core functionality, logging, and schema definitions
- **`@sidequest/engine`** - Job processing engine with worker thread management
- **`@sidequest/backend`** - Abstract backend interface
- **`@sidequest/sqlite-backend`** - SQLite backend implementation
- **`@sidequest/postgres-backend`** - PostgreSQL backend implementation
- **`@sidequest/mysql-backend`** - MySQL backend implementation
- **`@sidequest/dashboard`** - Web dashboard with Express.js, EJS, and HTMX
- **`@sidequest/cli`** - Command-line interface tools
- **`@sidequest/backend-test`** - Test suite for backend implementations

### Setup

```bash
# Clone the repository
git clone https://github.com/sidequestjs/sidequest.git
cd sidequest

# Enable Corepack
corepack enable

# Install dependencies
yarn install

# Build all packages
yarn build

# Run tests
yarn test

# Start development mode
yarn dev
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

## 📄 License

This project is licensed under the [LGPL-3.0-or-later](LICENSE.md) license.

## 🆘 Support

- 📖 [Documentation](https://docs.sidequestjs.com)
- 🐛 [Issue Tracker](https://github.com/sidequestjs/sidequest/issues)
- 💬 [Discussions](https://github.com/sidequestjs/sidequest/discussions)

---

Made with ❤️ by Lucas Merencia and Giovani Guizzo
