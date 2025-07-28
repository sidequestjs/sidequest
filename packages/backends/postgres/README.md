# @sidequest/postgres-backend

PostgreSQL backend driver for the [Sidequest](https://github.com/sidequestjs/sidequest) job processing system.
This is the recommended backend for production use due to its advanced features and reliability.

## Summary

This package provides a PostgreSQL implementation of the Sidequest backend interface, enabling you to use PostgreSQL as the storage layer for your job queue. It offers all the features of Sidequest including job management, queue operations, statistics, and cleanup routines, while leveraging PostgreSQL's advanced features like JSONB support, powerful date functions, and robust concurrency handling.

The PostgreSQL backend extends the `SQLBackend` base class and provides optimized SQL queries for job processing, including atomic job claiming operations using PostgreSQL's advanced locking mechanisms and efficient time-based analytics with PostgreSQL's `date_trunc` function.

## Installation

Install the PostgreSQL backend package:

```bash
npm install @sidequest/postgres-backend
```

You'll also need to install the main Sidequest package if you haven't already:

```bash
npm install sidequest
```

## Basic Usage with Sidequest

### Sidequest Configuration

Configure Sidequest to use the PostgreSQL backend:

```typescript
import { Sidequest } from "sidequest";

await Sidequest.start({
  backend: {
    driver: "@sidequest/postgres-backend",
    config: "postgresql://postgres:password@localhost:5432/sidequest",
  },
  queues: [{ name: "default", priority: 10, workers: 2 }],
});
```

### Connection String Examples

**Local PostgreSQL:**

```typescript
backend: {
  driver: '@sidequest/postgres-backend',
  config: 'postgresql://postgres:password@localhost:5432/myapp'
}
```

**PostgreSQL with Custom Port:**

```typescript
backend: {
  driver: '@sidequest/postgres-backend',
  config: 'postgresql://user:password@localhost:5433/myapp'
}
```

**Remote PostgreSQL:**

```typescript
backend: {
  driver: '@sidequest/postgres-backend',
  config: 'postgresql://user:password@postgres.example.com:5432/myapp'
}
```

**PostgreSQL with SSL:**

```typescript
backend: {
  driver: '@sidequest/postgres-backend',
  config: 'postgresql://user:password@localhost:5432/myapp?sslmode=require'
}
```

### Features

- **Advanced Concurrency** - Uses PostgreSQL's robust locking mechanisms for safe job claiming
- **JSONB Support** - Efficient storage and querying of job arguments and metadata
- **Date Functions** - Leverages PostgreSQL's `date_trunc` for precise time-based analytics
- **Migration Support** - Automatic database schema management with Knex.js migrations
- **Connection Pooling** - Built-in connection pooling for high-performance operations
- **ACID Compliance** - Full ACID transaction support for data integrity

## License

LGPL-3.0-or-later
