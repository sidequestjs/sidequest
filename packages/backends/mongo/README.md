# @sidequest/mongo-backend

MongoDB backend driver for the [Sidequest](https://github.com/sidequestjs/sidequest) job processing system.

## Summary

This package provides a MongoDB implementation of the Sidequest backend interface, enabling you to use MongoDB as the storage layer for your job queue. It offers all the features of Sidequest including job management, queue operations, statistics, and cleanup routines, while leveraging MongoDB's document-based storage and powerful aggregation capabilities.

The MongoDB backend implements the complete `Backend` interface and provides optimized queries for job processing, including atomic job claiming operations and efficient time-based analytics using MongoDB's aggregation framework.

## Installation

Install the MongoDB backend package:

```bash
npm install @sidequest/mongo-backend
```

You'll also need to install the main Sidequest package if you haven't already:

```bash
npm install sidequest
```

## Basic Usage with Sidequest

### Sidequest Configuration

Configure Sidequest to use the MongoDB backend:

```typescript
import { Sidequest } from "sidequest";

await Sidequest.start({
  backend: {
    driver: "@sidequest/mongo-backend",
    config: "mongodb://localhost:27017/sidequest",
  },
  queues: [{ name: "default", priority: 10, workers: 2 }],
});
```

### Connection String Examples

**Local MongoDB:**

```typescript
backend: {
  driver: '@sidequest/mongo-backend',
  config: 'mongodb://localhost:27017/myapp'
}
```

**MongoDB with Authentication:**

```typescript
backend: {
  driver: '@sidequest/mongo-backend',
  config: 'mongodb://username:password@localhost:27017/myapp'
}
```

**MongoDB Atlas:**

```typescript
backend: {
  driver: '@sidequest/mongo-backend',
  config: 'mongodb+srv://username:password@cluster.mongodb.net/myapp'
}
```

**Replica Set:**

```typescript
backend: {
  driver: '@sidequest/mongo-backend',
  config: 'mongodb://mongo1:27017,mongo2:27017,mongo3:27017/myapp?replicaSet=rs0'
}
```

### Features

- **Atomic Operations** - Uses MongoDB's `findOneAndUpdate` for safe job claiming
- **Efficient Indexing** - Optimized indexes for job lookup and queue operations
- **Aggregation Analytics** - Leverages MongoDB's aggregation framework for statistics
- **Time-based Queries** - Advanced time-range filtering and job analytics
- **Unique Job Support** - Implements job uniqueness constraints using partial indexes

## License

LGPL-3.0-or-later
