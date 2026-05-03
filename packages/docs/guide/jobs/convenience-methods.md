---
outline: deep
title: Job Convenience Methods
description: Job Convenience Methods guide for Sidequest.js
---

# Job Convenience Methods

Sidequest.js provides several convenience methods that can be used inside your job's `run` method to control job execution flow and trigger specific state transitions. These methods help you handle different scenarios like manual completion, failures, retries, and delays.

## Overview

The convenience methods available in job classes are:

- [**`complete(result)`**](#complete-result-method) - Mark the job as completed with a specific result
- [**`fail(reason)`**](#fail-reason-method) - Mark the job as permanently failed
- [**`retry(reason, delay?)`**](#retry-reason-delay-method) - Force a retry with optional delay
- [**`snooze(delay)`**](#snooze-delay-method) - Delay job execution for a specified time

::: danger IMPORTANT
You must **return** the result of any convenience method to trigger the job transition. Simply calling them without returning their result will do absolutely nothing.

```typescript
// ❌ Wrong - this does nothing
this.fail("Something went wrong");

// ✅ Correct - this marks the job as failed indefinitely
return this.fail("Something went wrong");
```

:::

## `complete(result)` Method

Explicitly mark a job as completed with a specific result. This is useful when you want to control exactly what gets stored as the job result.
This is also optional, as jobs will automatically complete when the `run` method finishes without throwing an error and store anything returned.

### Complete Method Signature

```typescript
complete(result: unknown): CompletedResult
```

### Complete Method Parameters

- `result` - The result to store in the job's `result` field. This can be any serializable value.

### Complete Method Examples

```typescript
export class DataValidationJob extends Job {
  async run(data: any) {
    if (this.isValid(data)) {
      // Explicitly complete with validation details
      return this.complete({
        valid: true,
        data: data,
        validatedAt: new Date(),
        validator: "v2.1.0",
      });
    }

    return this.fail("Data validation failed");
  }
}
```

```typescript
export class ConditionalJob extends Job {
  async run(condition: string) {
    switch (condition) {
      case "process":
        const result = await this.processData();
        return this.complete(result);

      case "skip":
        return this.complete({ skipped: true, reason: "Condition not met" });

      default:
        return this.fail(`Unknown condition: ${condition}`);
    }
  }
}
```

## `fail(reason)` Method

Mark a job as permanently failed, bypassing any remaining retry attempts. The job will move directly to the `failed` state.

### Fail Method Signature

```typescript
fail(reason: string | Error): FailedResult
```

### Fail Method Parameters

- `reason` - The reason for the failure, can be a string message or an Error object. This will be stored in the job's `errors` field.

### Fail Method Examples

```typescript
export class UserProcessingJob extends Job {
  async run(userId: number) {
    const user = await this.getUser(userId);

    if (!user) {
      // Permanent failure - user doesn't exist
      return this.fail(`User ${userId} not found`);
    }

    if (user.isDeleted) {
      // Permanent failure - user is deleted
      return this.fail(`User ${userId} has been deleted`);
    }

    // Continue processing...
    return this.processUser(user);
  }
}
```

```typescript
export class FileProcessingJob extends Job {
  async run(filePath: string) {
    try {
      const fileExists = await this.checkFileExists(filePath);

      if (!fileExists) {
        // File doesn't exist - no point retrying
        return this.fail(new Error(`File not found: ${filePath}`));
      }

      const content = await this.readFile(filePath);

      if (!this.isValidFormat(content)) {
        // Invalid format - won't get better on retry
        return this.fail("File format is invalid and cannot be processed");
      }

      return this.processFile(content);
    } catch (error) {
      return this.fail(`Unexpected error while processing file: ${error.message}`);
    }
  }
}
```

## `retry(reason, delay?)` Method

Force a job retry with a custom reason and optional delay. This is useful when you want to retry due to specific conditions rather than thrown exceptions.

### Retry Method Signature

```typescript
retry(reason: string | Error, delay?: number): RetryResult
```

### Retry Method Parameters

- `reason` - The reason for the retry (string or Error object)
- `delay` - Optional delay in milliseconds before the retry

### Retry Method Examples

```typescript
export class ExternalServiceJob extends Job {
  async run(apiEndpoint: string) {
    try {
      const response = await fetch(apiEndpoint);

      if (response.status === 429) {
        // Rate limited - retry after delay
        const retryAfter = response.headers.get("Retry-After");
        const delay = retryAfter ? parseInt(retryAfter) * 1000 : 60000;

        return this.retry(`Rate limited by API (HTTP 429)`, delay);
      }

      if (!response.ok) {
        // Client error - probably permanent
        return this.fail(`API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      // Network errors - let normal retry mechanism handle
      throw error;
    }
  }
}
```

```typescript
export class ServiceDependencyJob extends Job {
  async run(serviceId: string) {
    const serviceStatus = await this.checkServiceStatus(serviceId);

    if (serviceStatus === "maintenance") {
      // Service in maintenance - retry in 15 minutes
      return this.retry("Service is in maintenance mode", 15 * 60 * 1000);
    }

    if (serviceStatus === "degraded") {
      // Service degraded - retry sooner
      return this.retry("Service performance is degraded", 2 * 60 * 1000);
    }

    if (serviceStatus !== "operational") {
      return this.fail(`Service is in unknown state: ${serviceStatus}`);
    }

    // Service is operational, proceed
    return this.callService(serviceId);
  }
}
```

## `snooze(delay)` Method

Delay job execution for a specified amount of time. The job returns to the `waiting` state and becomes available again after the delay period.

### Snooze Method Signature

```typescript
snooze(delay: number): SnoozeResult
```

### Snooze Method Parameters

- `delay` - Delay in milliseconds

### Snooze Method Examples

```typescript
export class ScheduledTaskJob extends Job {
  async run(scheduledTime: string) {
    const targetTime = new Date(scheduledTime);
    const now = new Date();

    if (now < targetTime) {
      // Not time yet - snooze until scheduled time
      const delay = targetTime.getTime() - now.getTime();
      return this.snooze(delay);
    }

    // It's time to execute
    return this.executeScheduledTask();
  }
}
```

```typescript
export class BusinessHoursJob extends Job {
  async run(data: any) {
    if (!this.isBusinessHours()) {
      // Wait until next business day at 9 AM
      const nextBusinessDay = this.getNextBusinessDay();
      const delay = nextBusinessDay.getTime() - Date.now();

      return this.snooze(delay);
    }

    // Execute during business hours
    return this.processBusinessData(data);
  }

  private isBusinessHours(): boolean {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();

    // Monday-Friday, 9 AM - 5 PM
    return day >= 1 && day <= 5 && hour >= 9 && hour < 17;
  }

  private getNextBusinessDay(): Date {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);

    // Skip weekends
    while (tomorrow.getDay() === 0 || tomorrow.getDay() === 6) {
      tomorrow.setDate(tomorrow.getDate() + 1);
    }

    return tomorrow;
  }
}
```

## Best Practices

1. **Use appropriate methods**: Choose the right convenience method for your situation
   - `fail()` for permanent, unrecoverable errors
   - `retry()` for transient issues that might resolve
   - `snooze()` for timing-based delays
   - `complete()` for explicit control over results
2. **Always return the result**: Never call convenience methods without returning their result
3. **Provide meaningful reasons**: Include descriptive error messages and reasons
4. **Use reasonable delays**: Don't retry too aggressively - respect external services
5. **Combine with try-catch**: Use convenience methods for controlled flow, exceptions for unexpected errors
