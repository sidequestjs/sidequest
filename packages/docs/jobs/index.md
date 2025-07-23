---
outline: deep
title: Jobs
description: Jobs guide for Sidequest.js
---

# Jobs Guide

In Sidequest.js, jobs are the core units of work that you can enqueue and process. This guide will help you understand how to create, configure, and manage jobs in your application.

## What is a Job?

A job in Sidequest.js is a unit of work that can be executed asynchronously. Jobs are stored in a backend (database) and processed by workers in a queue-based system. Each job consists of:

- **Class Name**: The job class that defines the work to be performed
- **Constructor Arguments**: Arguments used to build the job object
- **Run Method**: The method (with optional arguments) that contains the job logic and is executed when the job is processed
- **Queue**: Which queue the job belongs to (for organization and concurrency control)
- **State**: Current status of the job (waiting, running, completed, etc.). See more in the [Job Lifecycle](./lifecycle.md) page.
- **Configuration**: Retry attempts, timeouts, uniqueness constraints, and more

## How Jobs Work

Jobs in Sidequest.js follow this execution flow:

1. **Creation**: Jobs are created and enqueued using a [job builder](/engine/enqueue)
2. **Storage**: Job data is persisted in your chosen backend (SQLite, PostgreSQL, MySQL)
3. **Claiming**: Workers claim available jobs from [queues](/queues/index) based on concurrency limits
4. **Construction**: Job objects are constructed using the [job class](./class.md) and constructor arguments
5. **Execution**: The [job's `run` method](./run-method.md) is executed with the provided arguments
6. **Transition**: Based on the result, [jobs follow their lifecycle](./lifecycle.md) by transitioning to completed, failed, canceled, or waiting (in case of retry) states
7. **Cleanup**: Completed or failed [jobs can be cleaned up](/engine/cleanup.md) based on retention policies

## Job Enqueuing

Jobs are enqueued by using a `JobBuilder`. For more info on how to enqueue jobs, refer to the [Job Enqueuing guide](/engine/enqueue).

## Job Metadata

Each job has several metadata fields that provide information about its state and execution.

- **`id`**: Unique identifier for the job
- **`queue`**: Name of the queue the job belongs to
- **`class`**: Name of the job class
- **`script`**: Path to the job script file used to execute it
- **`args`**: Arguments passed to the job `run` method
- **`constructor_args`**: Arguments passed to the job constructor
- **`state`**: Current state of the job (waiting, running, completed, failed, canceled)
- **`inserted_at`**: When the job was first created
- **`available_at`**: When the job becomes available for processing (used for delays)
- **`claimed_at`**: When the job was claimed by a worker
- **`attempted_at`**: When the job execution started
- **`completed_at`**: When the job finished successfully
- **`failed_at`**: When the job failed permanently
- **`canceled_at`**: When the job was canceled
- **`attempt`**: Current attempt number (starts at 0, increments on each run)
- **`max_attempts`**: Maximum number of attempts allowed
- **`timeout`**: Maximum time in milliseconds allowed for the job to run before aborting execution
- **`claimed_by`**: Identifier of the worker that last claimed the job
- **`result`**: Return value from successful job execution
- **`errors`**: Array of error information from failed attempts
- **`unique_digest`**: Unique identifier for the job based on its class and arguments (if uniqueness is configured)
- **`uniqueness_config`**: Configuration for job uniqueness (if applicable)

## Job Results and Errors

### Successful Results

When a job completes successfully, the return value is stored in the `result` field:

```typescript
export class CalculationJob extends Job {
  async run(a: number, b: number) {
    const result = a + b;
    return { sum: result, timestamp: new Date() };
  }
}

// After completion, job.result contains:
// { sum: 42, timestamp: "2024-01-01T12:00:00.000Z" }
```

### Error Information

When jobs fail, error details are stored in the `errors` array:

```json
[
  {
    "name": "Error",
    "message": "Database connection failed",
    "stack": "Error: Database connection failed\n    at ...",
    "attempt": 0,
    "attempt_by": "worker-1",
    "attempted_at": "2024-01-01T12:00:00.000Z"
  },
  ...
]
```

## Job Execution Model

Sidequest.js uses a **multi-process, multi-threaded** execution model:

- **Isolation**: Jobs run in separate threads, preventing crashes from affecting other jobs
- **Concurrency**: Multiple jobs can run simultaneously within configured limits
- **Reliability**: Failed jobs don't crash the entire system

## Basic Example

Here's a simple job that processes user data:

```typescript
import { Job } from "@sidequest/engine";
import { getUserById, sendWelcomeEmail } from "./myAwesomeApp";

export class ProcessUserJob extends Job {
  async run(userId: number, action: string) {
    // Your business logic here
    const user = await getUserById(userId);

    if (action === "send_welcome_email") {
      await sendWelcomeEmail(user.email);
      return { emailSent: true, userId };
    }

    throw new Error(`Unknown action: ${action}`);
  }
}
```

1. A Job should always extend the `Job` class from Sidequest.js. The job class defines the work to be performed and provides the structure for job execution.
2. A Job should always implement a `run` method that contains the job logic.

## What's Next?

This jobs documentation covers everything you need to know about working with jobs:

- **[Job Lifecycle](./lifecycle.md)**: Understanding job states and transitions
- **[Job Class](./class.md)**: How to create job classes and structure your work
- **[Run Method](./run-method.md)**: Implementing job logic and handling results
- **[Convenience Methods](./convenience-methods.md)**: Built-in methods for common job transitions
- **[Logging](./logging.md)**: How to add logging and debugging to your jobs
