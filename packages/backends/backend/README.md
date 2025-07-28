# @sidequest/backend

The core backend interfaces and abstract implementations for the [Sidequest job processing system](https://github.com/sidequestjs/sidequest).

## Overview

This package provides the foundational types, interfaces, and abstract base classes that define how Sidequest interacts with different database backends. It serves as the contract that all backend implementations must follow, ensuring consistency across different database providers.

## What's Included

### Core Interface

- **`Backend`** - The main interface that defines all operations a backend must implement, including job management, queue operations, migrations, and statistics.

### Abstract Base Class

- **`SQLBackend`** - An abstract base class for SQL-based backends that provides common functionality using Knex.js, including database migrations, job claiming logic, and query utilities.

### Type Definitions

- **Job Types** - `NewJobData`, `UpdateJobData`, `JobCounts` for job operations
- **Queue Types** - `NewQueueData`, `UpdateQueueData` for queue management
- **Configuration** - `BackendConfig` for backend driver configuration

### Factory Function

- **`createBackendFromDriver()`** - Dynamically loads and instantiates backend implementations from driver names

## Usage

This package is typically not used directly by end users. Instead, it's consumed by:

1. **Concrete backend implementations** (e.g., `@sidequest/postgres`, `@sidequest/sqlite`, `@sidequest/mysql`)
2. **The core Sidequest engine** for type safety and consistent interfaces
3. **Backend developers** who want to create custom backend implementations

### Example Backend Implementation

```typescript
import { SQLBackend } from "@sidequest/backend";
import knex from "knex";

export default class MyCustomBackend extends SQLBackend {
  constructor(config: any) {
    super(knex(config));
  }

  // Implement any custom methods or override existing ones
}
```

## License

LGPL-3.0-or-later
