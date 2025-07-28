# @sidequest/sqlite-backend

SQLite backend driver for the [Sidequest](https://github.com/sidequestjs/sidequest) job processing system.
This is the default backend for development and testing due to its simplicity and zero-configuration setup. Not recommended for production use.

## Summary

This package provides a SQLite implementation of the Sidequest backend interface, enabling you to use SQLite as the storage layer for your job queue. It offers all the features of Sidequest including job management, queue operations, statistics, and cleanup routines, while leveraging SQLite's simplicity, zero-configuration setup, and file-based storage.

The SQLite backend extends the `SQLBackend` base class and provides optimized SQL queries for job processing, including atomic job claiming operations using SQLite transactions and efficient local file-based storage perfect for development, testing, and single-server deployments.

## Installation

Install the SQLite backend package:

```bash
npm install @sidequest/sqlite-backend
```

You'll also need to install the main Sidequest package if you haven't already:

```bash
npm install sidequest
```

## Basic Usage with Sidequest

### Sidequest Configuration

Configure Sidequest to use the SQLite backend:

```typescript
import { Sidequest } from "sidequest";

await Sidequest.start({
  backend: {
    driver: "@sidequest/sqlite-backend",
    config: "./sidequest.sqlite",
  },
  queues: [{ name: "default", priority: 10, workers: 2 }],
});
```

### Connection String Examples

**Default SQLite File:**

```typescript
backend: {
  driver: '@sidequest/sqlite-backend',
  config: './sidequest.sqlite'
}
```

**Custom Database Path:**

```typescript
backend: {
  driver: '@sidequest/sqlite-backend',
  config: '/var/data/myapp.sqlite'
}
```

**In-Memory Database (Testing):**

```typescript
backend: {
  driver: '@sidequest/sqlite-backend',
  config: ':memory:'
}
```

### Features

- **Zero Configuration** - No database server setup required, just specify a file path
- **File-Based Storage** - Self-contained database in a single file for easy deployment
- **ACID Transactions** - Full transaction support for data integrity and safe job claiming
- **Lightweight** - Minimal resource footprint, perfect for development and small deployments
- **Migration Support** - Automatic database schema management with Knex.js migrations
- **Portable** - Database files can be easily backed up, moved, or shared

## License

LGPL-3.0-or-later
