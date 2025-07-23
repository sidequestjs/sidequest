# Queue Priority in Sidequest

This document provides a detailed explanation of **queue priority** in Sidequest, its purpose, how it works, and best practices for configuring priorities effectively.

## What is queue priority?

**Queue priority** determines the relative importance of a queue compared to other queues when multiple queues have pending jobs. Queues with higher priority values are given preference by the scheduler when deciding which queue’s jobs to process next.

Priority is configured per queue as a positive integer. There is no hard limit, but it is recommended to use a reasonable scale (e.g. 0–100) for clarity.

## How it works

When Sidequest has available workers and multiple queues have pending jobs, it compares the `priority` of each queue. Jobs from the highest-priority queue are selected first. Within a queue, jobs are processed in the order they were enqueued, respecting the queue’s `concurrency` limit.

If two or more queues have the same priority, they are served in a round-robin fashion.

## Default behavior

If no priority is specified in a queue’s configuration, it defaults to `0`.

Example:

```ts
queues: [
  { name: "default", concurrency: 2 }, // priority defaults to 0
  { name: "critical", concurrency: 5, priority: 100 },
  { name: "low", concurrency: 1, priority: 10 }
]
```

In this example, jobs in the `critical` queue will take precedence over `low` and `default`, as long as there is available concurrency.

## Best practices for priority

- 📊 **Use clear scales:** Choose a consistent scale for priorities (e.g. multiples of 10 or 100).
- 🧩 **Avoid excessive gaps:** Don’t create extreme differences unless strictly necessary.
- 🔄 **Balance with concurrency:** Priority only determines order, but `concurrency` limits still apply per queue.
- 🧪 **Monitor impact:** Adjust priorities based on observed job throughput and latency.
