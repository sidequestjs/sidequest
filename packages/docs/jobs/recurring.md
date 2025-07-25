---
outline: deep
title: Recurring Jobs
description: How to schedule recurring jobs with Sidequest.js using cron expressions.
---

# Recurring Jobs (Scheduling with Cron)

Sidequest supports scheduling jobs to run automatically at recurring intervals using cron expressions. This allows you to trigger background jobs on a fixed schedule—without manual intervention—directly from your code, with just one line.

## Quick Example

```ts
import { Sidequest } from "sidequest";
import { MyJob } from "./jobs/my-job";

// Schedule MyJob to run every 10 seconds
Sidequest.build(MyJob).schedule("*/10 * * * * *");
```

This schedules a new instance of `MyJob` to be enqueued every 10 seconds.

## How Scheduling Works

- Scheduling is **in-memory** only: schedules are not persisted to the database.
- Schedules must be registered each time your application starts. Typically, you should place schedule calls in your application bootstrap/startup logic.
- Each time the cron expression matches, a new job is enqueued with the arguments you specify (if any).
- By default, jobs are enqueued in the "default" queue unless configured otherwise.
- Sidequest uses [`node-cron`](https://www.npmjs.com/package/node-cron) for robust cron parsing and execution.

## When Should I Use Scheduling?

Use recurring jobs for tasks like:

- Periodic data synchronization
- Sending notifications or reminders
- Cleanup and maintenance routines
- Any background process that needs to run on a schedule

## Arguments and Examples

### `schedule(cronExpression: string, ...args: any[]): void`

Schedules the job to be enqueued automatically according to a cron expression.

#### Parameters

- `cronExpression` (`string`): A valid cron expression (see [node-cron docs](https://www.npmjs.com/package/node-cron#cron-syntax)), e.g. `'0 * * * *'` for every hour or `'*/10 * * * * *'` for every 10 seconds.
- `...args`: Arguments passed to the job's `run` method each time it is enqueued.

#### Example

```ts
Sidequest.build(MyJob).schedule("0 * * * *"); // Every hour
Sidequest.build(MyJob).schedule("*/5 * * * * *", "foo"); // Every 5 seconds with argument
```

#### Throws

- Throws an error if the cron expression is invalid.

#### Notes

- **In-memory only:** Scheduled tasks are NOT persisted in the database. You must re-register schedules on every app startup.
- **No overlap:** Sidequest uses `noOverlap: true` by default—if a previous run is still in progress, a new job will not be enqueued for that tick.

## Limitations and Recommendations

- **Persistence:** If your application restarts, any scheduled jobs must be re-scheduled via code. (This is by design and similar to other popular job libraries.)
- **Clustering:** In a multi-instance environment, each instance will create its own scheduled jobs unless you coordinate or restrict scheduling to a single node. To avoid duplicate executions, we recommend enabling job uniqueness with a period window (e.g. “unique per hour” or “unique per minute”), so that even if multiple nodes schedule the same job, only one will actually run for each interval.
