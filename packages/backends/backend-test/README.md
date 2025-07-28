# @sidequest/backend-test

A comprehensive test suite for validating [Sidequest](https://github.com/sidequestjs/sidequest) backend implementations.

## Overview

This package provides a standardized test suite that all Sidequest backend implementations should pass. It ensures that backends correctly implement the `Backend` interface and behave consistently across different database providers.

The test suite is built using **Vitest** and covers all core backend operations including job management, queue operations, migrations, and cleanup routines.

## What's Tested

### Core Operations

- **Job Management** - Creating, updating, claiming, and retrieving jobs
- **Queue Operations** - Creating, updating, and listing queues
- **State Transitions** - Job lifecycle management across all states
- **Concurrency Safety** - Ensuring jobs can only be claimed once
- **Migration Support** - Database schema setup and teardown

### Advanced Features

- **Job Statistics** - Counting jobs by state and time ranges
- **Stale Job Detection** - Finding jobs that have timed out or become stale
- **Cleanup Operations** - Removing finished jobs and truncating data
- **Uniqueness Constraints** - Testing job uniqueness features
- **Time-based Queries** - Jobs over time analytics

## Requirements

### Dependencies

Install the following packages to use the test suite:

- **vitest** - Testing framework
- **@sidequest/backend-test** - Test suite for Sidequest backends

```bash
npm install --save-dev @sidequest/backend-test vitest
# or
yarn add -D @sidequest/backend-test vitest
```

### Backend Implementation Requirements

Your backend must implement the complete `Backend` interface, including:

- All CRUD operations for jobs and queues
- Database migration support
- Proper state management and concurrency handling
- Statistics and analytics methods
- Cleanup and maintenance operations

### Test Setup

The test suite is designed to be used in your backend's test files. Simply import the `testBackend` function and provide a factory that creates your backend instance:

```typescript
import { testBackend } from "@sidequest/backend-test";
import MyBackend from "../src/my-backend";

// For file-based databases like SQLite
testBackend(() => new MyBackend("test.sqlite"));

// For connection-string databases like PostgreSQL
const connectionString = process.env.DATABASE_URL ?? "postgresql://localhost:5432/test";
testBackend(() => new MyBackend(connectionString));
```

This code should be included in your backend's test files, typically in a `*.test.ts` file.

## Running Tests

Add the test to your package.json scripts:

```json
{
  "scripts": {
    "test": "vitest",
    "test:ci": "vitest run"
  }
}
```

Then run with:

```bash
npm test
# or
yarn test
```

For CI environments:

```bash
npm run test:ci
# or
yarn test:ci
```

## Test Structure

The test suite automatically handles:

### Setup and Teardown

- **Before Each Test** - Creates a fresh backend instance and runs migrations
- **After Each Test** - Truncates all data and closes the backend connection

### 🚨 Important 🚨

**TESTING ONLY** - This test suite is designed for testing environments only. It will:

- Truncate the database after every test
- Delete all jobs and queues
- Should never be used with production data

## License

LGPL-3.0-or-later
