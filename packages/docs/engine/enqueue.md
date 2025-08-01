---
outline: deep
title: Enqueueing Jobs
description: Complete guide to enqueueing jobs using the JobBuilder pattern in Sidequest.js
---

# Enqueueing Jobs

Once your [Sidequest engine is configured](./configuration), you can enqueue jobs for processing using the `Sidequest.build()` method. This method returns a `JobBuilder` instance that provides a fluent interface for configuring and enqueueing jobs.

## Basic Job Enqueueing

The simplest way to enqueue a job is using the minimal builder pattern:

```typescript
import { Sidequest } from "sidequest";
import { EmailJob } from "./jobs/EmailJob.js";

// Minimal job enqueueing
await Sidequest.build(EmailJob).enqueue("user@example.com", "Welcome!", "Thanks for signing up!");
```

This creates a job with default settings and enqueues it immediately.

## JobBuilder Pattern

The `JobBuilder` uses a fluent interface that allows you to chain configuration methods before enqueueing:

```typescript
await Sidequest.build(EmailJob)
  .queue("emails")
  .timeout(30000)
  .maxAttempts(3)
  .unique(true)
  .availableAt(new Date(Date.now() + 60000))
  .enqueue("user@example.com", "Welcome!", "Thanks for signing up!");
```

If you prefer to enqueue multiple jobs with similar configurations, you can reuse the job builder:

```typescript
const emailJobBuilder = Sidequest.build(EmailJob)
  .queue("emails")
  .timeout(30000)
  .maxAttempts(3)
  .availableAt(new Date(Date.now() + 60000));

for (const user of users) {
  await emailJobBuilder.enqueue(user.email, "Welcome!", "Thanks for signing up!");
}
```

## Builder Configuration Options

### `.queue(queueName: string)`

Specifies which queue the job should be processed in. Queues allow you to organize jobs by type, priority, or processing requirements.

```typescript
await Sidequest.build(EmailJob)
  .queue("emails") // Process in the "emails" queue
  .enqueue(...args);

await Sidequest.build(ReportJob)
  .queue("reports") // Process in the "reports" queue
  .enqueue(...args);
```

**Default**: `"default"`

**Key Points:**

- If the queue doesn't exist, it will be created automatically with default settings when running the job
- Check the [Queue Management](/queues/index) section for more details on queue configuration

### `.timeout(milliseconds: number)`

Sets the maximum execution time for the job in milliseconds. If the job exceeds this time, it will be terminated and marked as failed.
If it has remaining attempts, it will be retried according to the configured retry policy.

```typescript
await Sidequest.build(EmailJob)
  .timeout(30000) // 30 seconds timeout
  .enqueue(...args);

await Sidequest.build(LongRunningJob)
  .timeout(5 * 60 * 1000) // 5 minutes timeout
  .enqueue(...args);
```

**Default:** `undefined` (no timeout)

### `.maxAttempts(count: number)`

Sets the maximum number of times the job will be retried if it fails. This includes the initial attempt.

```typescript
await Sidequest.build(EmailJob)
  .maxAttempts(3) // Try up to 3 times total
  .enqueue(...args);

await Sidequest.build(CriticalJob)
  .maxAttempts(5) // More retries for critical jobs
  .enqueue(...args);
```

**Default:** `5`

**Retry Behavior:**

- Attempts include the initial run + retries
- Failed jobs are automatically retried with exponential backoff
- Jobs that exceed max attempts are marked as "failed" and are not retried again

### `.availableAt(date: Date)`

Schedules the job to become available for processing at a specific time. This is useful for delayed job execution.

```typescript
// Run immediately
await Sidequest.build(EmailJob)
  .availableAt(new Date())
  .enqueue(...args);

// Run in 1 hour
await Sidequest.build(ReminderJob)
  .availableAt(new Date(Date.now() + 60 * 60 * 1000))
  .enqueue(...args);

// Run at specific date/time
await Sidequest.build(ScheduledReportJob)
  .availableAt(new Date("2025-08-01T09:00:00Z"))
  .enqueue(...args);
```

**Default:** `now` (immediate execution)

### `.unique(configuration: UniquenessInput)`

Controls job uniqueness to prevent duplicate jobs from being enqueued. The uniqueness system can work in several modes:

#### Simple Uniqueness

```typescript
// Enable basic uniqueness (by job class only)
await Sidequest.build(EmailJob)
  .unique(true)
  .enqueue(...args);

// Disable uniqueness
await Sidequest.build(EmailJob)
  .unique(false)
  .enqueue(...args);
```

**Default**: `false` (no uniqueness)

#### Advanced Uniqueness Configuration

```typescript
type UniquenessInput =
  | boolean
  | {
      withArgs?: boolean;
      period?: TimePeriod;
    };

type TimePeriod = "second" | "minute" | "hour" | "day" | "week" | "month";
```

**Alive Job Uniqueness** (default when `unique(true)`):

- Prevents enqueuing if a job of the same type is waiting, claimed, or running
- Job becomes available for re-enqueuing once completed, failed, or cancelled

```typescript
// Basic alive job uniqueness (by class name only)
await Sidequest.build(EmailJob).unique(true).enqueue("user1@example.com", "Welcome!");

// With arguments consideration
await Sidequest.build(EmailJob).unique({ withArgs: true }).enqueue("user1@example.com", "Welcome!");
```

If the option `withArgs` is set to `true`, the uniqueness check will consider the job arguments as well, preventing duplicate jobs with the same arguments.

**Fixed Window Uniqueness:**

- Prevents enqueuing within a specific time period
- Useful for rate limiting or preventing spam

```typescript
// Allow only one job of the same class per hour
await Sidequest.build(WeeklyReportJob)
  .unique({
    period: "hour",
  })
  .enqueue(...args);

// Allow only one job of the same class per day (considering args)
await Sidequest.build(DailyDigestJob)
  .unique({
    withArgs: true,
    period: "day",
  })
  .enqueue(userId);
```

**Uniqueness Examples:**

```typescript
// Prevent duplicate email verification jobs
await Sidequest.build(EmailVerificationJob)
  .unique({ withArgs: true }) // Unique per email address
  .enqueue("user@example.com");

// Rate limit password reset emails
await Sidequest.build(PasswordResetJob)
  .unique({
    withArgs: true,
    period: "hour", // Max one per email per hour
  })
  .enqueue("user@example.com");
```

### `.with(...constructorArgs)`

Sets constructor arguments for the job class. These are passed to the job's constructor when the job is instantiated.

```typescript
class CustomEmailJob extends Job {
  constructor(
    private apiKey: string,
    private region: string,
  ) {
    super();
  }

  async run(to: string, subject: string, body: string) {
    // Use this.apiKey and this.region
  }
}

// Set constructor arguments
await Sidequest.build(CustomEmailJob)
  .with("api-key-123", "us-east-1") // Constructor args
  .enqueue("user@example.com", "Hello", "Message body"); // Run method args
```

**Default**: `[]` (no constructor arguments)

**Key Points:**

- Constructor args are set once when building the job
- Run method args are provided when calling `.enqueue()`
- Constructor args are stored with the job and passed during job execution

### `.enqueue(...args?: unknown[])`

Enqueues the job with the provided arguments. The arguments are sent to the [Job's `run` method](/jobs/run-method). This method is called after all configuration methods.

```typescript
// Enqueue with run method arguments
await Sidequest.build(EmailJob).enqueue("user@example.com", "Hello", "Message body");
```

**Default**: `[]` (no run method arguments)

### `.schedule(cronExpression: string, ...args?: unknown[])`

For recurring jobs, you can use the `.schedule()` method instead of `.enqueue()`:

```typescript
// Schedule a job to run every day at 9 AM
const scheduledTask = await Sidequest.build(DailyReportJob)
  .queue("reports")
  .timeout(5 * 60 * 1000)
  .schedule("0 9 * * *", reportConfig);

// The scheduledTask is a node-cron ScheduledTask that can be controlled
scheduledTask.stop();
```

This method uses [node-cron](https://www.npmjs.com/package/node-cron) to run a cron job that enqueues jobs based on the given cron expression. In this sense, scheduled jobs are similar to regular jobs but are enqueued by a scheduling cron rather than an immediate enqueue call.

::: warning Scheduled Jobs
While jobs enqueued by the cron/schedule job are persisted to the database, the scheduling cron itself is **not persisted**. They exist only in memory and will be lost if the process restarts. Make sure to re-register scheduled jobs during application startup. Already enqueued jobs will be processed normally.
:::

## Complete Examples

### Minimal Example

```typescript
import { Sidequest } from "sidequest";
import { EmailJob } from "./jobs/EmailJob.js";

// Simple job with default settings
await Sidequest.build(EmailJob).enqueue("user@example.com", "Welcome!", "Thanks for signing up!");
```

### Comprehensive Example

```typescript
import { Sidequest } from "sidequest";
import { EmailJob, PasswordResetJob, WeeklyReportJob } from "./jobs";

// Email job with retry and timeout
await Sidequest.build(EmailJob)
  .queue("emails")
  .timeout(30000)
  .maxAttempts(3)
  .unique({ withArgs: true }) // Unique per recipient and content
  .enqueue("user@example.com", "Welcome!", "Thanks for signing up!");

// Password reset with rate limiting
await Sidequest.build(PasswordResetJob)
  .queue("critical")
  .timeout(15000)
  .maxAttempts(5)
  .unique({
    withArgs: true,
    period: "hour", // Max one per email per hour
  })
  .enqueue("user@example.com");

// Scheduled weekly report
await Sidequest.build(WeeklyReportJob)
  .queue("reports")
  .timeout(5 * 60 * 1000) // 5 minutes
  .maxAttempts(2)
  .availableAt(getNextSunday()) // Custom scheduling function
  .unique({
    period: "week", // One per week maximum
  })
  .enqueue(userId, reportType);

// Job with constructor arguments
await Sidequest.build(CustomApiJob)
  .with("api-key", "us-east-1") // Constructor args
  .queue("api-calls")
  .timeout(60000)
  .unique(false) // Allow multiple concurrent API calls
  .enqueue("GET", "/users", { page: 1 }); // Run method args
```

## Error Handling

Handle job enqueueing errors appropriately:

```typescript
try {
  const job = await Sidequest.build(EmailJob).timeout(30000).unique(true).enqueue("user@example.com", "Hello", "World");

  console.log(`Job enqueued with ID: ${job.id}`);
} catch (error) {
  if (error.message.includes("unique")) {
    console.log("Job already exists, skipping...");
  } else {
    console.error("Failed to enqueue job:", error);
    throw error;
  }
}
```

## Next Steps

- **[Job Classes](/jobs/index)** - Learn how to create custom job classes
- **[Queue Management](/queues/index)** - Understand queue configuration and management
- **[Monitoring Jobs](/dashboard)** - Use the dashboard to monitor job execution
