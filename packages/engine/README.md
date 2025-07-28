# @sidequest/engine

Core job processing engine for the [Sidequest](https://github.com/sidequestjs/sidequest) job processing system.

## Summary

This package contains the core job processing engine that powers Sidequest.js. It manages job execution, worker threads, queue processing, background maintenance routines, and graceful shutdown handling. The engine is responsible for orchestrating all aspects of job processing including job claiming, execution, state transitions, error handling, and cleanup operations.

**⚠️ Important:** This package is not intended for direct use by end users. It is a core internal package that is used by the main `sidequest` package. Always use the main package instead:

```typescript
// ❌ Don't do this
import { Engine } from "@sidequest/engine";

// ✅ Do this instead
import { Sidequest } from "sidequest";
```

The engine package provides:

- **Job Processing Engine** - Core orchestration of job execution with worker thread management
- **Queue Management** - Queue configuration, priority handling, and concurrency control
- **Worker Thread Pool** - Scalable worker thread management using Piscina for job isolation
- **Background Routines** - Automated cleanup of finished jobs and stale job recovery
- **Graceful Shutdown** - Clean termination with job completion and resource cleanup
- **Job Lifecycle Management** - Complete job state transitions from waiting to completion
- **Error Handling** - Comprehensive error capture, retry logic, and failure management
- **Performance Optimization** - Efficient job claiming, batching, and resource utilization
- **Monitoring Integration** - Metrics and logging for job processing insights

The engine is designed to work seamlessly with all Sidequest backends (PostgreSQL, MySQL, SQLite, MongoDB) and provides the foundation for reliable, scalable job processing in production environments.

## Documentation

For complete configuration options, advanced usage, and architectural details, visit:

**[https://docs.sidequestjs.com/engine/](https://docs.sidequestjs.com/engine/)**

The documentation covers:

- **Engine Configuration** - Backend setup, queue configuration, and performance tuning
- **Starting the Engine** - Initialization, startup options, and lifecycle management
- **Queue Management** - Queue creation, priority settings, and concurrency control
- **Job Processing** - Worker thread management, execution flow, and error handling
- **Background Routines** - Cleanup operations, stale job recovery, and maintenance
- **Graceful Shutdown** - Clean termination procedures and resource management
- **Performance Tuning** - Thread pool sizing, concurrency limits, and optimization
- **Monitoring** - Logging, metrics, and health check integration
- **Troubleshooting** - Common issues, debugging techniques, and best practices

### Core Components

The engine consists of several key components:

- **`Engine`** - Main orchestrator class managing all job processing operations
- **`JobBuilder`** - Factory for creating and configuring job instances
- **`JobTransitioner`** - Handles job state transitions and lifecycle management
- **`QueueManager`** - Manages queue configurations and processing priorities
- **`WorkerPool`** - Thread pool management for isolated job execution
- **`RoutineManager`** - Background maintenance and cleanup operations
- **`SharedRunner`** - Coordination between main thread and worker threads

## License

LGPL-3.0-or-later
