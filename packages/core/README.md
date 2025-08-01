# @sidequest/core

Core types, interfaces, and utilities for the [Sidequest](https://github.com/sidequestjs/sidequest) job processing system.

## Summary

This package contains the foundational types, interfaces, and utilities that power the Sidequest job processing system. It provides the core data structures, job state management, uniqueness strategies, error handling, and logging functionality used throughout the Sidequest ecosystem.

**⚠️ Important:** This package is not intended for direct use by end users. All exports from `@sidequest/core` are re-exported by the main `sidequest` package. Use the main package instead:

```typescript
// ❌ Don't do this
import { JobData } from "@sidequest/core";

// ✅ Do this instead
import { JobData } from "sidequest";
```

The core package serves as the shared foundation for:

- **Backend implementations** (PostgreSQL, MySQL, SQLite, MongoDB)
- **The job processing engine**
- **Queue management systems**
- **The web dashboard**
- **CLI tools**

## Important Types

### Job Management

#### `JobData`

The complete data structure representing a job in the system, including:

- Job metadata (id, queue, state, class, script)
- Execution details (args, constructor_args, attempt, max_attempts)
- Timing information (available_at, inserted_at, attempted_at, completed_at, etc.)
- Error tracking and results
- Uniqueness configuration and digest

#### `JobState`

Enumeration of possible job states:

- `"waiting"` - Ready or scheduled for execution
- `"claimed"` - Reserved by a worker
- `"running"` - Currently executing
- `"failed"` - Permanently failed (max attempts exceeded)
- `"completed"` - Finished successfully
- `"canceled"` - Manually canceled

### Queue Configuration

#### `QueueConfig`

Configuration interface for job queues:

- `id` - Unique identifier
- `name` - Human-readable queue name
- `concurrency` - Maximum concurrent jobs
- `state` - Queue operational state (`"active"` | `"paused"`)
- `priority` - Processing priority order

#### `QueueState`

Queue operational states:

- `"active"` - Currently processing items
- `"paused"` - Paused, not processing items

### Job Transitions

#### `JobTransition`

Abstract base class for job state transitions, providing:

- `apply(job: JobData): JobData` - Applies the transition
- `shouldRun(job: JobData): boolean` - Determines if transition should be applied

Available transition implementations:

- `CancelTransition` - Cancel a job
- `CompleteTransition` - Mark job as completed
- `FailTransition` - Mark job as failed
- `RetryTransition` - Retry a failed job
- `RerunTransition` - Rerun a completed job
- `SnoozeTransition` - Delay job execution

### Uniqueness System

#### `UniquenessConfig`

Base configuration for uniqueness strategies:

- `type` - Strategy type identifier

#### `Uniqueness<Config>`

Interface for implementing uniqueness strategies:

- `config` - Strategy configuration
- `digest(jobData: JobData): string | null` - Compute uniqueness digest

Available uniqueness implementations:

- `AliveJobUniqueness` - Prevent duplicates while jobs are alive
- `FixedWindowUniqueness` - Prevent duplicates within time windows

### Error Handling

#### `ErrorData`

Structured error information for job failures:

- Error messages and stack traces
- Attempt-specific error tracking
- Serialized error data

### Logging

#### `LoggerOptions`

Configuration for the Winston-based logging system:

- `level` - Minimum log level
- `json` - JSON output format option

#### Logger Functions

- `configureLogger(options: LoggerOptions)` - Set up logging
- `logger(component?: string)` - Get component-specific logger

### Utility Tools

- **Error Serialization** - Convert errors to/from JSON
- **Error Parsing** - Parse structured error data
- **Type Guards** - Runtime type checking utilities

## License

LGPL-3.0-or-later
