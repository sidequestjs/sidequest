---
outline: deep
title: Graceful Shutdown
description: Understanding and implementing graceful shutdown in Sidequest.js
---

# Graceful Shutdown

Graceful shutdown is a critical feature that ensures your jobs complete safely when your application needs to stop. Sidequest automatically handles shutdown scenarios to prevent data loss and maintain job integrity.

## How Graceful Shutdown Works

When Sidequest receives a termination signal (`SIGINT` or `SIGTERM`), it initiates a graceful shutdown process:

1. **Stop Accepting New Jobs**: No new jobs are claimed from the queue
2. **Wait for Running Jobs**: Currently executing jobs are allowed to complete
3. **Clean Resource Cleanup**: Backend connections and worker processes are properly closed
4. **Controlled Exit**: The process exits only after all cleanup is complete

```typescript
// Graceful shutdown is enabled by default
await Sidequest.start({
  gracefulShutdown: true, // Default: true
});

// Disable graceful shutdown (not recommended)
await Sidequest.start({
  gracefulShutdown: false,
});
```

## Shutdown Scenarios

### Normal Graceful Shutdown

When your application receives its first termination signal:

```bash
# Press Ctrl+C or send SIGTERM
kill -TERM <process_id>
```

**What happens:**

- Sidequest logs: `"Received SIGTERM. Shutting down gracefully..."`
- Running jobs continue to execute until completion
- No new jobs are started
- Process exits when all jobs finish

### Forced Shutdown

If a second termination signal is received during graceful shutdown:

```bash
# Send another SIGTERM or SIGINT while shutdown is in progress
kill -TERM <process_id>
```

**What happens:**

- Sidequest logs: `"Received SIGTERM while already shutting down. Forcing shutdown."`
- All running jobs are immediately terminated
- Process exits immediately
- Jobs may be left in inconsistent states

## Stale Job Recovery

When jobs are forcefully terminated, they may remain in `running` or `claimed` states. Sidequest includes automatic stale job detection and recovery:

### Automatic Stale Job Detection

Sidequest periodically scans for stale jobs based on configurable timeouts:

```typescript
await Sidequest.start({
  // Stale job detection settings
  releaseStaleJobsIntervalMin: 60, // Check every 60 minutes
  releaseStaleJobsMaxStaleMs: 600000, // 10 minutes for running jobs
  releaseStaleJobsMaxClaimedMs: 60000, // 1 minute for claimed jobs

  // Disable stale job detection (not recommended)
  releaseStaleJobsIntervalMin: false,
});
```

### Job-Level Timeout Configuration

Set appropriate timeouts for your jobs to help with stale job detection:

```typescript
await Sidequest.build(LongRunningJob)
  .timeout(5 * 60 * 1000) // 5 minute timeout
  .maxAttempts(2) // Retry once if it times out
  .enqueue(...args);
```

If a job is still running after the configured timeout, it will be marked as stale and retried automatically.

### Manual Stale Job Recovery

You can also manually find and recover stale jobs:

```typescript
// Find stale jobs
const staleJobs = await Sidequest.job.findStale();
console.log(`Found ${staleJobs.length} stale jobs`);

// The engine will automatically retry these jobs
```

## Implementation in Your Application

### Basic Shutdown Handling

Sidequest automatically registers shutdown handlers, but you may want to add your own:

```typescript
import { Sidequest } from "sidequest";

// Start Sidequest
await Sidequest.start(config);

// Optional: Add custom shutdown logic
const gracefulShutdown = async (signal: string) => {
  console.log(`Received ${signal}, shutting down...`);

  // Perform any custom cleanup
  await closeDatabase();
  await closeRedisConnection();

  // Stop Sidequest
  await Sidequest.stop();

  console.log("Shutdown complete");
  process.exit(0);
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
```

## Best Practices

### 1. Use Appropriate Timeouts

Set realistic timeouts based on your job complexity:

```typescript
// Short jobs
await Sidequest.build(EmailJob)
  .timeout(30000)  // 30 seconds
  .enqueue(...);

// Medium jobs
await Sidequest.build(ImageProcessingJob)
  .timeout(5 * 60 * 1000)  // 5 minutes
  .enqueue(...);

// Long jobs
await Sidequest.build(DataMigrationJob)
  .timeout(30 * 60 * 1000)  // 30 minutes
  .enqueue(...);
```

We don't recommend disabling timeouts, as they help prevent jobs from hanging indefinitely.

### 2. Monitor Stale Jobs

Set up monitoring for stale job occurrences:

```typescript
// Check for stale jobs periodically
setInterval(
  async () => {
    const staleJobs = await Sidequest.job.findStale();
    if (staleJobs.length > 0) {
      console.warn(`Found ${staleJobs.length} stale jobs`);
      // Alert your monitoring system
    }
  },
  5 * 60 * 1000,
); // Check every 5 minutes
```

### 3. Health Checks

Implement health checks that consider job processing state:

```typescript
app.get("/health", async (req, res) => {
  try {
    const backend = Sidequest.getBackend();

    // Check for excessive stale jobs
    const staleJobs = await Sidequest.job.findStale();
    const isHealthy = staleJobs.length < 10; // Threshold

    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? "healthy" : "degraded",
      staleJobCount: staleJobs.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: "unhealthy",
      error: error.message,
    });
  }
});
```

## Troubleshooting

### Jobs Not Completing During Shutdown

**Problem**: Jobs seem to hang during graceful shutdown.

**Solutions**:

- Check job timeouts are appropriate
- Ensure jobs don't have infinite loops
- Verify jobs handle interruption signals
- Consider reducing job complexity

### Frequent Stale Jobs

**Problem**: Many jobs become stale after shutdowns.

**Solutions**:

- Increase timeout values for complex jobs
- Improve deployment shutdown timing
- Check if jobs are genuinely taking too long
- Monitor system resources during job execution

### Dashboard Shows Stuck Jobs

**Problem**: Jobs remain in "running" state after restart.

**Solutions**:

- Wait for automatic stale job detection cycle
- Manually trigger stale job recovery
- Check stale job detection configuration
- Verify system clock synchronization

## Next Steps

- **[Job Cleanup](/engine/cleanup)** - Learn about automatic job cleanup
- **[Monitoring](/dashboard)** - Use the dashboard to monitor job states
- **[Configuration](/engine/configuration)** - Configure timeout and cleanup settings
