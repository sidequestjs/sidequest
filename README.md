# Sidequest

[![NPM Version](https://img.shields.io/npm/v/sidequest.svg)](https://www.npmjs.com/package/sidequest)
[![License](https://img.shields.io/badge/license-LGPL--3.0--or--later-blue.svg)](LICENSE.md)
![Build Status](https://github.com/sidequestjs/sidequest/actions/workflows/pull-request.yml/badge.svg?branch=master)
[![TypeScript](https://img.shields.io/badge/language-typescript-blue.svg)](https://www.typescriptlang.org/)
![Node.js Version](https://img.shields.io/node/v/sidequest.svg)
[![Docs](https://img.shields.io/badge/docs-available-blue.svg)](https://docs.sidequestjs.com)

![Sidequest.js Logo](./packages/docs/public/logo-full.png "Sidequest.js Logo")

**Sidequest** is a Redis-free background job processor for **Node.js**. It persists jobs in the database you already run (PostgreSQL, MySQL, SQLite, or MongoDB), so you get durable, distributed background processing without standing up Redis. It is a production-grade [BullMQ](https://docs.sidequestjs.com/getting-started/migrating-from-bullmq) and pg-boss alternative, with a built-in web dashboard.

### At a glance

- **Runtime:** Node.js (>= 22.6.0). _Does not run on Bun yet._
- **Storage:** PostgreSQL, MySQL, SQLite, or MongoDB. Jobs are **durable and persisted in your database**, not in memory. SQLite is recommended for local development and tests.
- **Distribution:** runs across multiple nodes against one shared database. Jobs are claimed atomically (`SELECT ... FOR UPDATE SKIP LOCKED` on Postgres/MySQL), so each job runs once.
- **Isolation:** the engine runs in a forked child process; jobs execute in worker threads. Inline and no-fork [execution modes](https://docs.sidequestjs.com/production/execution-modes) are also available.
- **Built in:** web dashboard, retries with exponential/fixed backoff, job uniqueness, cron scheduling, and automatic stale-job recovery.

For the complete documentation, visit [docs.sidequestjs.com](https://docs.sidequestjs.com).

For a comprehensive FAQ, visit [docs.sidequestjs.com/faq](https://docs.sidequestjs.com/faq).

## ✨ Features

- 🚀 **High Performance** - Worker threads for non-blocking job processing
- 🗄️ **Multiple Backends** - PostgreSQL, MySQL, SQLite, MongoDB support out of the box
- ✅ **ESM and CJS support** - Fully compatible with modern JavaScript
- 📝 **Support for Typescript** - Supports TypeScript jobs by default if you are using [Node.js >= v23.6.0](https://nodejs.org/en/learn/typescript/run-natively)
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

Make sure you are using Node.js >= 22.6.0. Also, [Sidequest does not run with Bun yet](https://github.com/sidequestjs/sidequest/issues/72).

To keep the application minimal, the main package does _not_ include the backend drivers. Thus you need to install only the driver you will use:

**PostgreSQL (recommended)**

```bash
npm install @sidequest/postgres-backend
# or
yarn add @sidequest/postgres-backend
```

<details>
  <summary>MySQL</summary>
  
```bash
npm install @sidequest/mysql-backend
# or
yarn add @sidequest/mysql-backend
```
</details>

<details>
  <summary>SQLite (default - not recommended for production)</summary>

```bash
npm install @sidequest/sqlite-backend
# or
yarn add @sidequest/sqlite-backend
```

</details>

<details>
  <summary>MongoDB</summary>
  
```bash
npm install @sidequest/mongo-backend
# or
yarn add @sidequest/mongo-backend
```
</details>

<br />

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

// Start Sidequest
await Sidequest.start({
  // You can leave the config empty to use the default SQLite backend.
  // Make sure to install the SQLite backend driver if you want to use it.
  backend: {
    driver: "@sidequest/postgres-backend",
    config: "postgres://postgres:postgres@localhost:5432",
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

Made with ❤️ by [Lucas Merencia](https://github.com/merencia) and [Giovani Guizzo](https://github.com/GiovaniGuizzo)
