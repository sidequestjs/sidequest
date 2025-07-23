---
outline: deep
title: Job Lifecycle
description: Jobs Lifecycle guide for Sidequest.js
---

# Job Lifecycle

Jobs in Sidequest.js go through well-defined states as they progress from creation to completion. Understanding these states helps you monitor job execution and debug issues.

## Job States

Jobs progress through the following states:

- **`waiting`** - Job is queued and waiting to be processed
- **`claimed`** - Job has been claimed by a worker and is about to start
- **`running`** - Job is currently being processed
- **`completed`** - Job finished successfully
- **`failed`** - Job failed and won't be retried (max attempts reached)
- **`canceled`** - Job was manually canceled

## State Transitions

The lifecycle of a job can be visualized as follows:

![Job State Diagram](/public/state-diagram.png)

### Normal Execution Flow

```text
waiting → claimed → running → completed
```

1. **Creation**: Job starts in `waiting` state when enqueued
2. **Claiming**: Dispatcher claims the job, moving it to `claimed`
3. **Execution**: Worker starts processing, job becomes `running`
4. **Completion**: Job finishes successfully, becomes `completed`

### Failure and Retry Flow

```text
waiting → claimed → running → waiting (retry)
waiting → claimed → running → failed (max attempts)
```

When a job fails but has remaining retry attempts:

1. Job returns to `waiting` state with incremented attempt counter
2. Errors are recorded in the job's `errors` field
3. Job waits for any configured retry delay
4. Job is eligible to be claimed and run again

When a job fails and has no remaining attempts:

1. Job moves to `failed` state permanently
2. Error information in the job's `errors` field

### Manual Cancellation

```text
waiting → canceled
claimed → canceled
running → canceled
```

Jobs can be manually canceled at any point before completion:

- Waiting jobs are immediately marked as `canceled`
- Claimed jobs are marked as `canceled` before execution an are prevented from running
- Running jobs receive a cancellation signal and transition to `canceled`

## Best Practices

1. **Set appropriate timeouts**: Configure job timeouts to prevent indefinite hanging
2. **Monitor failed jobs**: Set up alerts for jobs that fail permanently. You can poll the backend for failed jobs and notify your team
3. **Clean up old jobs**: Regularly clean up completed and failed jobs to manage storage (Sidequest has a configuration for that - see [cleanup guide](/engine/cleanup.md))
4. **Use meaningful delays**: Don't retry immediately - use exponential backoff for transient failures
