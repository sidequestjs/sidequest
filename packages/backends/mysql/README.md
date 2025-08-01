# @sidequest/mysql-backend

MySQL backend driver for the [Sidequest](https://github.com/sidequestjs/sidequest) job processing system.

## Summary

This package provides a MySQL implementation of the Sidequest backend interface, enabling you to use MySQL as the storage layer for your job queue. It offers all the features of Sidequest including job management, queue operations, statistics, and cleanup routines, while leveraging MySQL's robust ACID properties and proven reliability.

The MySQL backend extends the `SQLBackend` base class and provides optimized SQL queries for job processing, including atomic job claiming operations using transactions and efficient time-based analytics with MySQL's date functions.

## Installation

Install the MySQL backend package:

```bash
npm install @sidequest/mysql-backend
```

You'll also need to install the main Sidequest package if you haven't already:

```bash
npm install sidequest
```

## Basic Usage with Sidequest

### Sidequest Configuration

Configure Sidequest to use the MySQL backend:

```typescript
import { Sidequest } from "sidequest";

await Sidequest.start({
  backend: {
    driver: "@sidequest/mysql-backend",
    config: "mysql://root:password@localhost:3306/sidequest",
  },
  queues: [{ name: "default", priority: 10, workers: 2 }],
});
```

### Connection String Examples

**Local MySQL:**

```typescript
backend: {
  driver: '@sidequest/mysql-backend',
  config: 'mysql://root:password@localhost:3306/myapp'
}
```

**MySQL with Custom Port:**

```typescript
backend: {
  driver: '@sidequest/mysql-backend',
  config: 'mysql://user:password@localhost:3307/myapp'
}
```

**Remote MySQL:**

```typescript
backend: {
  driver: '@sidequest/mysql-backend',
  config: 'mysql://user:password@mysql.example.com:3306/myapp'
}
```

**MySQL with SSL:**

```typescript
backend: {
  driver: '@sidequest/mysql-backend',
  config: 'mysql://user:password@localhost:3306/myapp?ssl=true'
}
```

### Features

- **ACID Transactions** - Uses MySQL transactions for safe job claiming and state changes
- **Optimized Indexes** - Efficient indexes for job lookup and queue operations
- **SQL Analytics** - Leverages MySQL's date functions for time-based statistics
- **Migration Support** - Automatic database schema management with Knex.js migrations
- **Connection Pooling** - Built-in connection pooling for high-performance operations

## License

LGPL-3.0-or-later
