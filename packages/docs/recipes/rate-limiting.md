---
title: Rate Limiting
description: Throttle job throughput using queue concurrency and job snooze.
---

# Rate Limiting

Sidequest doesn't have a dedicated rate-limiter primitive, but you can throttle throughput with two tools: **queue concurrency** and **job snooze**.

## Limit throughput with queue concurrency

The simplest approach: set `concurrency: 1` on a queue. Jobs in that queue run one at a time, naturally capping throughput to one job per job-duration.

```typescript
await Sidequest.start({
  queues: [
    { name: "default", concurrency: 5 },
    { name: "external-api", concurrency: 1 }, // one request at a time
  ],
});
```

```typescript
await Sidequest.build(CallExternalAPIJob)
  .queue("external-api")
  .enqueue(payload);
```

For APIs with a requests-per-second limit, set concurrency to the max parallel calls you're allowed.

## Snooze to enforce a minimum gap

If an external API allows 1 request/second, you can enforce that gap by snoozing the job for the remainder of the second after it runs:

```typescript
export class CallExternalAPIJob extends Job {
  async run(payload: unknown) {
    const start = Date.now();

    await callExternalAPI(payload);

    const elapsed = Date.now() - start;
    const minGap = 1000; // 1 second between calls
    const remaining = minGap - elapsed;

    if (remaining > 0) {
      // Snooze the *next* job by re-checking in `remaining` ms
      // (This snoozes THIS job — if you need to delay the next one,
      // keep the queue at concurrency: 1 and snooze here)
    }
  }
}
```

A cleaner pattern: use `concurrency: 1` + `availableAt` to schedule jobs with gaps:

```typescript
// Spread 60 jobs over 60 seconds (1/sec)
const jobs = await getJobsToProcess();
let delay = 0;
for (const item of jobs) {
  await Sidequest.build(CallExternalAPIJob)
    .queue("external-api")
    .availableAt(new Date(Date.now() + delay))
    .enqueue(item);
  delay += 1000;
}
```

## Backpressure with snooze

If you're calling a rate-limited API and get a 429, use `return this.snooze(retryAfterMs)` to yield and retry later:

```typescript
export class CallExternalAPIJob extends Job {
  async run(payload: unknown) {
    try {
      return await callExternalAPI(payload);
    } catch (error) {
      if (error.status === 429) {
        const retryAfter = parseInt(error.headers["retry-after"] ?? "30") * 1000;
        return this.snooze(retryAfter);
      }
      throw error;
    }
  }
}
```

`this.snooze(ms)` moves the job back to `pending` and makes it available after the delay. It does not consume a retry attempt.

## Priority queues for weighted throughput

If you have both a high-volume low-priority queue and a small critical queue, set priority to prefer the critical queue:

```typescript
queues: [
  { name: "critical", concurrency: 10, priority: 100 },
  { name: "bulk", concurrency: 5, priority: 10 },
]
```

When both queues have pending jobs, the Dispatcher selects from `critical` first. See [Queue Priority](/guide/queues/priority) for details.
