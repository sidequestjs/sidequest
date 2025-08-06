---
outline: deep
title: Backends
description: Complete guide to Sidequest.js backend drivers for different databases
---

# Backends

Sidequest supports multiple database backends to store and manage job data. Each backend provides the same functionality through a common interface, allowing you to choose the database that best fits your deployment requirements.

## Overview

Backends in Sidequest are responsible for:

- **Persistent storage** of job and queue data
- **Atomic operations** for job claiming and state transitions
- **Concurrency handling** for multi-worker environments
- **Database migrations** and schema management
- **Performance optimization** through database-specific features

All backends implement the same `Backend` interface, ensuring consistent behavior regardless of which database you choose.

## Available Backends

### PostgreSQL (Recommended)

PostgreSQL is the recommended backend for production use due to its advanced features, excellent concurrency handling, and proven reliability.

**Installation:**

```bash
npm install @sidequest/postgres-backend
```

**Configuration:**

```typescript
import { Sidequest } from "sidequest";

await Sidequest.start({
  backend: {
    driver: "@sidequest/postgres-backend",
    config: "postgresql://username:password@localhost:5432/sidequest",
  },
});
```

**Advantages:**

- **Excellent concurrency**: Advanced locking mechanisms prevent job conflicts
- **JSONB support**: Efficient storage and querying of job arguments and results
- **Advanced indexing**: Optimized performance for job queries
- **Production-ready**: Battle-tested in high-scale environments
- **Rich SQL features**: Support for complex queries and analytics

### SQLite

SQLite is the default backend, perfect for development, testing, and simple single-instance deployments.

**Installation:**

```bash
npm install @sidequest/sqlite-backend
```

**Configuration:**

```typescript
import { Sidequest } from "sidequest";

await Sidequest.start({
  backend: {
    driver: "@sidequest/sqlite-backend",
    config: "./sidequest.sqlite",
  },
});
```

**Connection Examples:**

```typescript
// File-based SQLite
config: "./data/sidequest.sqlite";

// Absolute path
config: "/var/lib/sidequest/jobs.db";

// In-memory database (testing only)
config: ":memory:";
```

#### SQLite Limitations and Considerations

::: warning SQLite Concurrency Limitations
SQLite is lightweight and great for development or single-instance setups. But when Sidequest runs with concurrency above 1 or across multiple processes, SQLite can start failing with `SQLITE_BUSY` because the database file is locked by another thread or process.

That happens because SQLite allows only one writer at a time and uses file-level locking.

If you really need SQLite in production, you should set `maxConcurrency: 1` to stay safe. Also, make sure Sidequest uses its own separate SQLite file, not the same one your app uses for storing application data, sharing the same file increases the chance of lock conflicts.

For multi-worker or distributed setups, Postgres, MySQL, or MongoDB are more appropriate choices.
:::

#### Production Considerations

```typescript
// Safe SQLite configuration for production
await Sidequest.start({
  backend: {
    driver: "@sidequest/sqlite-backend",
    config: "./sidequest-jobs.sqlite", // Separate file from app data
  },
  queues: [
    {
      name: "default",
      workers: 1, // Single worker to avoid concurrency issues
      priority: 10,
    },
  ],
});
```

**SQLite Advantages:**

- **Zero configuration**: No database server required
- **Simple deployment**: Single file storage
- **Fast for small workloads**: Excellent performance for low-concurrency scenarios
- **Development friendly**: Perfect for local development and testing

### MySQL

MySQL provides a solid middle ground with good performance and wide deployment support.

**Installation:**

```bash
npm install @sidequest/mysql-backend
```

**Configuration:**

```typescript
import { Sidequest } from "sidequest";

await Sidequest.start({
  backend: {
    driver: "@sidequest/mysql-backend",
    config: "mysql://username:password@localhost:3306/sidequest",
  },
});
```

**MySQL Advantages:**

- **Wide compatibility**: Available on most hosting platforms
- **Good performance**: Reliable for medium-scale deployments
- **Familiar tooling**: Extensive ecosystem and administration tools
- **ACID compliance**: Ensures data consistency

### MongoDB

MongoDB offers a NoSQL approach with flexible document storage and horizontal scaling capabilities.

**Installation:**

```bash
npm install @sidequest/mongo-backend
```

**Configuration:**

```typescript
import { Sidequest } from "sidequest";

await Sidequest.start({
  backend: {
    driver: "@sidequest/mongo-backend",
    config: "mongodb://localhost:27017/sidequest",
  },
});
```

**MongoDB Advantages:**

- **Document storage**: Natural fit for complex job data structures
- **Horizontal scaling**: Built-in support for sharding and replication
- **Flexible schema**: Easy to evolve job data structures
- **Aggregation framework**: Powerful analytics capabilities

## Backend Comparison

| Feature              | PostgreSQL                       | MySQL                            | MongoDB       | SQLite                         |
| -------------------- | -------------------------------- | -------------------------------- | ------------- | ------------------------------ |
| **Production Ready** | ✅ Excellent                     | ✅ Good                          | ✅ Good       | ⚠️ Limited                     |
| **Concurrency**      | ✅ Excellent                     | ✅ Good                          | ✅ Good       | ❌ Poor                        |
| **Scalability**      | ✅ Vertical + Limited Horizontal | ✅ Vertical + Limited Horizontal | ✅ Horizontal | ❌ Single Instance             |
| **Setup Complexity** | 🟡 Medium                        | 🟡 Medium                        | 🟡 Medium     | ✅ Zero                        |
| **Resource Usage**   | 🟡 Medium                        | 🟡 Medium                        | 🟡 Medium     | ✅ Low                         |
| **Performance**      | ✅ Excellent                     | ✅ Good                          | ✅ Good       | ✅ Excellent (low concurrency) |

## Using Backends

### Basic Usage

All backends follow the same configuration pattern:

```typescript
await Sidequest.start({
  backend: {
    driver: "@sidequest/[backend-name]",
    config: "connection-string-or-object",
  },
});
```

### Environment-Based Configuration

Use environment variables for different environments:

```typescript
const getBackendConfig = () => {
  const env = process.env.NODE_ENV || "development";

  switch (env) {
    case "production":
      return {
        driver: "@sidequest/postgres-backend",
        config: process.env.DATABASE_URL,
      };
    case "test":
      return {
        driver: "@sidequest/sqlite-backend",
        config: ":memory:",
      };
    default:
      return {
        driver: "@sidequest/sqlite-backend",
        config: "./dev-sidequest.sqlite",
      };
  }
};

await Sidequest.start({
  backend: getBackendConfig(),
});
```

### Migrations

All backends support automatic database migrations:

```typescript
// Run migrations manually
import { createBackendFromDriver } from "@sidequest/backend";

const backend = await createBackendFromDriver({
  driver: "@sidequest/postgres-backend",
  config: process.env.DATABASE_URL,
});

await backend.migrate();
await backend.close();
```

Migrations are automatically run when Sidequest starts, ensuring your database schema is up to date.

## Creating Custom Backends

You can create custom backends by implementing the `Backend` interface or extending the `SQLBackend` base class for SQL databases.

::: info
The backend class must be exported as a default export from the module. Sidequest will dynamically load it based on the `driver` string in the configuration.
:::

### Implementing the Backend Interface

```typescript
import { Backend, JobData, NewJobData, UpdateJobData, JobCounts } from "@sidequest/backend";
import { JobState, QueueConfig } from "@sidequest/core";

export class MyCustomBackend implements Backend {
  // Required methods to implement
  async migrate(): Promise<void> {
    // Implement database schema setup
  }

  async rollbackMigration(): Promise<void> {
    // Implement migration rollback
  }

  async close(): Promise<void> {
    // Cleanup connections and resources
  }

  // Queue operations
  async createNewQueue(queueConfig: NewQueueData): Promise<QueueConfig> {
    // Create new queue
  }

  async getQueue(queue: string): Promise<QueueConfig | undefined> {
    // Get queue by name
  }

  async listQueues(orderBy?: { column?: keyof QueueConfig; order?: "asc" | "desc" }): Promise<QueueConfig[]> {
    // List all queues
  }

  async updateQueue(queueData: UpdateQueueData): Promise<QueueConfig> {
    // Update queue configuration
  }

  async getQueuesFromJobs(): Promise<string[]> {
    // Get unique queue names from jobs
  }

  // Job operations
  async getJob(id: number): Promise<JobData | undefined> {
    // Get job by ID
  }

  async createNewJob(job: NewJobData): Promise<JobData> {
    // Create new job
  }

  async claimPendingJob(queue: string, quantity = 1): Promise<JobData[]> {
    // Atomically claim pending jobs from queue
  }

  async updateJob(job: UpdateJobData): Promise<JobData> {
    // Update job data
  }

  async listJobs(params?: {
    queue?: string | string[];
    jobClass?: string | string[];
    state?: JobState | JobState[];
    limit?: number;
    offset?: number;
    args?: unknown[];
    timeRange?: { from?: Date; to?: Date };
  }): Promise<JobData[]> {
    // List jobs with filters
  }

  async countJobs(timeRange?: { from?: Date; to?: Date }): Promise<JobCounts> {
    // Count jobs by state
  }

  async countJobsOverTime(timeRange: string): Promise<({ timestamp: Date } & JobCounts)[]> {
    // Count jobs over time for analytics
  }

  async staleJobs(maxStaleMs?: number, maxClaimedMs?: number): Promise<JobData[]> {
    // Find stale or timed-out jobs
  }

  async deleteFinishedJobs(cutoffDate: Date): Promise<void> {
    // Cleanup old completed/failed jobs
  }

  async truncate(): Promise<void> {
    // Clear all jobs and queues
  }
}
```

### Extending SQLBackend

For SQL databases, extend the `SQLBackend` base class:

```typescript
import { SQLBackend } from "@sidequest/backend";
import knex, { Knex } from "knex";

export default class MyCustomSQLBackend extends SQLBackend {
  constructor(config: any) {
    const db = knex({
      client: "my-sql-client",
      connection: config,
    });
    super(db);
  }

  // Override specific methods if needed
  protected truncateDate(unit: string): Knex.Raw {
    // Implement database-specific date truncation
    // This is used for time-based analytics
    switch (unit) {
      case "minute":
        return this.knex.raw("DATE_TRUNC('minute', attempted_at)");
      case "hour":
        return this.knex.raw("DATE_TRUNC('hour', attempted_at)");
      case "day":
        return this.knex.raw("DATE_TRUNC('day', attempted_at)");
      default:
        throw new Error(`Unsupported time unit: ${unit}`);
    }
  }
}
```

### Using your Custom Backend

You can use your custom backend in the same way as built-in backends:

```typescript
import { Sidequest } from "sidequest";

const sidequest = new Sidequest({
  backend: {
    // Custom backend configuration
    driver: "./my-custom-backend",
    config: "custom-connection-string",
  },
});
await sidequest.start();
```

::: info
The backend driver is dynamically loaded based on the `driver` string. It will basically call `import(config.backend.driver)` to load the module. Ensure your backend class is exported as a default export so Sidequest can find it.
:::

### Backend Requirements

When creating a custom backend, ensure:

1. **Atomic job claiming**: Jobs must be claimed atomically to prevent race conditions
2. **Transaction support**: Use transactions for data consistency
3. **Index optimization**: Add appropriate indexes for job and queue queries
4. **Error handling**: Proper error handling and connection management
5. **Migration support**: Implement schema versioning and migrations
6. **JSON serialization**: Handle complex job arguments and results properly

### Testing Your Backend

Use the backend test suite to verify your implementation:

```typescript
import { defineBackendTestSuite } from "@sidequest/backend-test";
import MyCustomBackend from "./my-custom-backend";

// Run the complete test suite
defineBackendTestSuite(() => new MyCustomBackend(testConfig));
```

## Best Practices

### Development

- **Use SQLite** for local development and testing
- **Separate database files** for Sidequest and application data
- **Use `:memory:` SQLite** for unit tests

### Production

- **Use PostgreSQL or MySQL** for production deployments
- **Configure connection pooling** for better performance
- **Monitor database performance** and query patterns
- **Set up database backups** and monitoring
- **Use environment variables** for configuration

### Performance

- **Choose appropriate indexes** based on your query patterns
- **Monitor job table size** and implement cleanup policies
- **Consider read replicas** for analytics queries
- **Optimize JSON queries** for complex job arguments

### Security

- **Use connection strings with authentication**
- **Enable SSL/TLS** for database connections
- **Restrict database permissions** to minimum required
- **Audit access patterns** and implement monitoring

## Troubleshooting

### SQLite Issues

```typescript
// SQLITE_BUSY errors
Error: SQLITE_BUSY: database is locked

// Solutions:
// 1. Reduce concurrency
queues: [{ name: "default", concurrency: 1 }]
// or
maxConcurrentJobs: 1

// 2. Use separate database file
backend: {
  driver: "@sidequest/sqlite-backend",
  config: "./sidequest-jobs.sqlite" // Not your main app database
}

// 3. Switch to PostgreSQL/MySQL for multi-worker setups
```

### Connection Issues

```typescript
// PostgreSQL connection refused
Error: connect ECONNREFUSED 127.0.0.1:5432

// Solutions:
// 1. Verify PostgreSQL is running
// 2. Check connection string
// 3. Verify network access and firewall settings
```

### Migration Issues

```typescript
// Migration failed
Error: relation "sidequest_jobs" already exists

// Solutions:
// 1. Check if tables already exist
// 2. Run migration rollback if needed
await backend.rollbackMigration();

// 3. Manually verify database state
```

## Next Steps

- **[Engine Configuration](/engine/configuration)** - Configure the Sidequest engine
- **[Queue Management](/queues/index)** - Learn about queue configuration and management
- **[Job Management](/jobs/index)** - Understand job creation and processing
- **[Dashboard](/dashboard)** - Monitor your jobs and queues
