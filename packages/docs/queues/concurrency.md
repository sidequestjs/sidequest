# Queue Concurrency in Sidequest

This document provides a detailed explanation of **queue concurrency** in Sidequest, its purpose, how it works, and best practices for configuring concurrency effectively.

## What is queue concurrency?

**Queue concurrency** controls the maximum number of jobs from a single queue that can run in parallel. This allows you to prevent a queue from consuming all available worker capacity, ensuring that other queues also get a share of resources.

Concurrency is configured per queue as a positive integer and applies only to that specific queue.

## How it works

Each queue in Sidequest has a dedicated pool of workers limited by its `concurrency` setting. When jobs are ready to run, Sidequest will not start more than `concurrency` jobs from a queue at the same time, even if more jobs are pending.

The total number of jobs running across all queues is also limited by the global `maxConcurrentJobs` parameter.

## Default behavior

If no concurrency is specified in a queue’s configuration, it defaults to `1`.

Example:

```ts
queues: [
  { name: "default", concurrency: 2 },
  { name: "critical", concurrency: 5 },
  { name: "low", concurrency: 1 },
];
```

In this example, at most 2 jobs from the `default` queue, 5 jobs from `critical`, and 1 job from `low` can run concurrently, provided the `maxConcurrentJobs` limit (a global Sidequest Engine configuration) limit is not exceeded.

## Best practices for concurrency

- 📊 **Match workload characteristics:** Higher concurrency for lightweight, fast jobs; lower concurrency for heavy, resource-intensive jobs.
- 🧩 **Consider downstream dependencies:** Avoid overloading external systems by limiting concurrency appropriately.
- 🔄 **Balance with priority:** Concurrency limits how many jobs from a queue can run at once, regardless of priority.
- 🧪 **Monitor performance:** Observe resource usage and adjust concurrency settings based on actual system behavior.
