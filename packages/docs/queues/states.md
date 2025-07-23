# Queue States in Sidequest

This document provides a detailed explanation of **queue states** in Sidequest, their meanings, use cases, and operational considerations. Understanding and managing queue states properly is essential to maintaining a reliable job processing system.

## What is a queue state?

A **queue state** determines whether a queue is currently processing jobs or not. It is a runtime property of a queue and can be changed dynamically.

In Sidequest, a queue can be in one of the following states:

| State      | Description                                                                                                                                                                             |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **active** | The queue is active and processes jobs normally. New jobs from this queue will be picked up and executed as long as concurrency and global limits allow.                                |
| **paused** | The queue is temporarily stopped. No new jobs will be picked up from this queue while in this state. Jobs already running continue until they finish. Waiting jobs remain in the queue. |

## Default behavior

When a queue is created (e.g. through `Sidequest.start()`), it defaults to the `active` state unless explicitly set otherwise in its configuration.

Example:

```ts
queues: [
  { name: "default", concurrency: 2 }, // defaults to active
  { name: "maintenance", concurrency: 1, state: "paused" }
]
```

## Changing queue states at runtime

Queue states can be changed at runtime without restarting Sidequest. This allows operators to pause or resume queues in response to operational needs. There is one supported method in the OSS version: use the **Dashboard** (if enabled). Navigate to the Queues page and toggle the desired queue’s state. In Sidequest Pro, an administrative API is also available for programmatic changes.

### Example scenarios

✅ **Pause a queue during maintenance:** If a downstream system is under maintenance, pause its related queue to avoid errors.\
✅ **Resume a queue after resolving an incident:** Once the dependency is healthy again, resume the queue to process pending jobs.\
✅ **Throttle less important workloads:** Temporarily pause low-priority queues to free resources for urgent tasks.

## Best practices for managing queue states

- Always monitor the number of pending jobs in a paused queue. Avoid leaving queues paused for too long without reviewing them.
- Document operational procedures for when and how to pause/resume queues.
- Use the dashboard regularly to ensure no queue is unintentionally left in `paused`.
- Communicate state changes to your team, especially in production environments.