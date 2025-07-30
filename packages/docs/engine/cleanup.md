---
outline: deep
title: Cleaning Up Jobs
description: How Sidequest.js automatically cleans up finished jobs and manages database growth
---

# Cleaning Up Jobs

Sidequest automatically manages job lifecycle by cleaning up finished jobs to prevent database growth and maintain optimal performance. This guide explains how cleanup works and how you can manage it.

## What Gets Cleaned Up

Sidequest cleans up jobs that have reached their final states:

- **Completed jobs**: Successfully finished jobs
- **Failed jobs**: Jobs that failed and exceeded their maximum retry attempts
- **Canceled jobs**: Jobs that were manually canceled

Jobs in active states (`waiting`, `running`, `claimed`) are never cleaned up automatically.

## Automatic Cleanup

### How It Works

Sidequest runs automatic cleanup on a configurable schedule using a cron job. The cleanup process:

1. **Identifies Finished Jobs**: Finds all jobs in final states (`completed`, `failed`, `canceled`)
2. **Applies Age Filter**: Only considers jobs older than the configured cutoff time
3. **Bulk Deletion**: Removes matching jobs from the database
4. **Logs Results**: Reports the number of jobs cleaned up

:::warning
Automatic cleanup is enabled by default, but you can configure the interval and age threshold.
It is also run every time the engine starts, ensuring no old jobs are left behind.
:::

### Configuration

Configure automatic cleanup during engine startup:

```typescript
await Sidequest.start({
  // Run cleanup every 60 minutes (default)
  cleanupFinishedJobsIntervalMin: 60,

  // Clean up jobs older than 30 days (default)
  cleanupFinishedJobsOlderThan: 30 * 24 * 60 * 60 * 1000,
});
```

### Configuration Options

| Option                           | Type              | Default   | Description                                        |
| -------------------------------- | ----------------- | --------- | -------------------------------------------------- |
| `cleanupFinishedJobsIntervalMin` | `number \| false` | `60`      | Cleanup interval in minutes, or `false` to disable |
| `cleanupFinishedJobsOlderThan`   | `number`          | `30 days` | Age threshold in milliseconds for job deletion     |

### Disabling Automatic Cleanup

You can disable automatic cleanup if you prefer manual control:

```typescript
await Sidequest.start({
  cleanupFinishedJobsIntervalMin: false, // Disable automatic cleanup
});
```

## Manual Cleanup

### Using Sidequest.job.deleteFinished()

Manually trigger cleanup of finished jobs:

```typescript
// Clean up jobs older than 7 days
const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
await Sidequest.job.deleteFinished(sevenDaysAgo);

// Clean up jobs older than 1 hour
const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
await Sidequest.job.deleteFinished(oneHourAgo);

// Clean up all finished jobs (not recommended)
await Sidequest.job.deleteFinished(new Date());
```

### Scheduled Manual Cleanup

Set up your own cleanup schedule:

```typescript
import cron from "node-cron";

// Run cleanup every day at 2 AM
cron.schedule("0 2 * * *", async () => {
  console.log("Running daily job cleanup...");

  const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days
  await Sidequest.job.deleteFinished(cutoffDate);

  console.log("Cleanup completed");
});
```

## Cleanup Strategies

### Conservative Cleanup (Default)

Keep jobs for a longer period to maintain audit trails and debugging capability:

```typescript
await Sidequest.start({
  cleanupFinishedJobsIntervalMin: 60, // Cleanup hourly
  cleanupFinishedJobsOlderThan: 30 * 24 * 60 * 60 * 1000, // Keep 30 days
});
```

**Use cases:**

- Production environments requiring audit trails
- Debugging and troubleshooting needs
- Compliance requirements

### Aggressive Cleanup

Clean up jobs more frequently to minimize database size:

```typescript
await Sidequest.start({
  cleanupFinishedJobsIntervalMin: 15, // Cleanup every 15 minutes
  cleanupFinishedJobsOlderThan: 24 * 60 * 60 * 1000, // Keep 1 day
});
```

**Use cases:**

- High-volume job processing
- Limited storage environments
- Development/testing environments

### Custom Cleanup Logic

Implement selective cleanup based on job types or other criteria:

```typescript
// Custom cleanup function
async function customCleanup() {
  // Get jobs older than different thresholds based on type
  const jobs = await Sidequest.job.list({
    state: ["completed", "failed", "canceled"],
    limit: 1000,
  });

  for (const job of jobs) {
    let shouldDelete = false;
    const jobAge = Date.now() - new Date(job.completed_at || job.failed_at).getTime();

    // Different retention policies by job class
    switch (job.class) {
      case "EmailJob":
        shouldDelete = jobAge > 7 * 24 * 60 * 60 * 1000; // 7 days
        break;
      case "ReportJob":
        shouldDelete = jobAge > 90 * 24 * 60 * 60 * 1000; // 90 days
        break;
      case "TemporaryJob":
        shouldDelete = jobAge > 60 * 60 * 1000; // 1 hour
        break;
      default:
        shouldDelete = jobAge > 30 * 24 * 60 * 60 * 1000; // 30 days
    }

    if (shouldDelete) {
      // Delete individual jobs (less efficient for large batches)
      await Sidequest.job.deleteFinished(new Date(job.completed_at || job.failed_at));
    }
  }
}

// Run custom cleanup daily
cron.schedule("0 3 * * *", customCleanup);
```

## Performance Considerations

### Database Impact

- **Large Deletions**: Deleting many jobs at once can impact database performance
- **Timing**: Run cleanup during low-traffic periods

### Optimization Tips

For very large job volumes, consider smaller, more frequent cleanups:

```typescript
// Instead of cleaning up 30 days worth at once
await Sidequest.start({
  cleanupFinishedJobsIntervalMin: 30, // More frequent cleanup
  cleanupFinishedJobsOlderThan: 3 * 24 * 60 * 60 * 1000, // Smaller batches (3 days)
});
```

## Troubleshooting

### Common Issues

#### Cleanup Not Running

**Problem**: Finished jobs are accumulating despite cleanup being enabled.

**Solutions**:

```typescript
// Check configuration
const config = Sidequest.getConfig();
console.log("Cleanup interval:", config?.cleanupFinishedJobsIntervalMin);
console.log("Cleanup threshold:", config?.cleanupFinishedJobsOlderThan);

// Verify manual cleanup works
await Sidequest.job.deleteFinished(new Date(Date.now() - 24 * 60 * 60 * 1000));
```

#### Performance Issues

**Problem**: Cleanup operations are causing database slowdowns.

**Solutions**:

- Reduce batch size by decreasing `cleanupFinishedJobsOlderThan`
- Increase interval with `cleanupFinishedJobsIntervalMin`
- Add database indexes
- Run cleanup during off-peak hours

#### Storage Space Issues

**Problem**: Database is growing too large despite cleanup.

**Solutions**:

```typescript
// More aggressive cleanup
await Sidequest.start({
  cleanupFinishedJobsIntervalMin: 15, // Every 15 minutes
  cleanupFinishedJobsOlderThan: 2 * 60 * 60 * 1000, // Keep only 2 hours
});

// One-time cleanup of old data
const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
await Sidequest.job.deleteFinished(oneWeekAgo);
```

## Best Practices

### 1. Choose Appropriate Retention Periods

```typescript
// Production: Balance audit needs with storage
cleanupFinishedJobsOlderThan: 30 * 24 * 60 * 60 * 1000, // 30 days

// Development: Aggressive cleanup
cleanupFinishedJobsOlderThan: 24 * 60 * 60 * 1000, // 1 day

// High-volume: Very aggressive
cleanupFinishedJobsOlderThan: 60 * 60 * 1000, // 1 hour
```

### 2. Monitor and Alert

```typescript
// Set up monitoring
const FINISHED_JOB_THRESHOLD = 10000;

setInterval(
  async () => {
    const counts = await Sidequest.job.count();
    const finished = counts.completed + counts.failed + counts.canceled;

    if (finished > FINISHED_JOB_THRESHOLD) {
      // Send alert to monitoring system
      console.error(`Too many finished jobs: ${finished}`);
    }
  },
  5 * 60 * 1000,
); // Check every 5 minutes
```

### 3. Test Cleanup Impact

```typescript
// Test cleanup performance in non-production
async function testCleanupPerformance() {
  const start = Date.now();
  const beforeCounts = await Sidequest.job.count();

  await Sidequest.job.deleteFinished(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));

  const afterCounts = await Sidequest.job.count();
  const duration = Date.now() - start;

  console.log({
    duration: `${duration}ms`,
    deletedJobs:
      beforeCounts.completed +
      beforeCounts.failed +
      beforeCounts.canceled -
      (afterCounts.completed + afterCounts.failed + afterCounts.canceled),
  });
}
```

### 4. Archive Before Cleanup

For compliance or audit requirements, consider archiving jobs before deletion:

```typescript
async function archiveAndCleanup() {
  const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Get jobs to be deleted
  const jobsToDelete = await Sidequest.job.list({
    state: ["completed", "failed", "canceled"],
    timeRange: { to: cutoffDate },
  });

  // Archive to external storage
  await archiveJobs(jobsToDelete);

  // Then cleanup
  await Sidequest.job.deleteFinished(cutoffDate);
}
```

## Next Steps

- **[Job Management](/jobs/index)** - Learn about job lifecycle and states
- **[Monitoring](/dashboard)** - Use the dashboard to monitor cleanup effectiveness
- **[Performance Tuning](/engine/configuration)** - Optimize cleanup for your workload
