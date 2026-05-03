---
title: Job Chaining
description: Running a sequence of jobs one after another using Sidequest.
---

# Job Chaining

Sidequest doesn't have a first-class "chain" primitive, but you can chain jobs by enqueueing the next step from inside a job's `run()` method. The next job is enqueued after the current one completes successfully.

## Basic chain

```typescript
// jobs/ProcessUploadJob.ts
import { Job, Sidequest } from "sidequest";
import { GenerateThumbnailJob } from "./GenerateThumbnailJob.js";

export class ProcessUploadJob extends Job {
  async run(fileId: string) {
    await processFile(fileId); // do the work

    // Enqueue the next step
    await Sidequest.build(GenerateThumbnailJob)
      .queue("media")
      .enqueue(fileId);

    return { processed: true };
  }
}
```

```typescript
// jobs/GenerateThumbnailJob.ts
import { Job, Sidequest } from "sidequest";
import { NotifyUserJob } from "./NotifyUserJob.js";

export class GenerateThumbnailJob extends Job {
  async run(fileId: string) {
    await generateThumbnail(fileId);

    await Sidequest.build(NotifyUserJob).enqueue(fileId);
    return { thumbnail: true };
  }
}
```

Each step starts only after the previous one finishes successfully. If a step fails and retries are exhausted, the chain stops — the next step is never enqueued.

## Fan-out: one job spawns many

A common pattern is one job creating many independent parallel jobs:

```typescript
// jobs/SendBroadcastJob.ts
import { Job, Sidequest } from "sidequest";
import { SendEmailJob } from "./SendEmailJob.js";

export class SendBroadcastJob extends Job {
  async run(message: string, userIds: string[]) {
    const users = await db.users.findMany({ where: { id: { in: userIds } } });

    for (const user of users) {
      await Sidequest.build(SendEmailJob)
        .queue("emails")
        .unique({ key: `broadcast:${message}:${user.id}` })
        .enqueue(user.email, "Announcement", message);
    }

    return { enqueued: users.length };
  }
}
```

The per-email jobs run in parallel, limited by the `emails` queue concurrency.

## Important: ESM/CJS context

::: warning
When you enqueue a job from inside another job's `run()`, both jobs must be in the same module system (both ESM or both CJS). Mixing module formats across the boundary causes runtime errors. See the [Enqueueing guide](/guide/jobs/enqueueing) for details.
:::

## Passing data between steps

Jobs don't share memory, so pass data through job arguments:

```typescript
export class StepOneJob extends Job {
  async run(input: string) {
    const result = await doStepOne(input);
    // Pass result to step two as argument
    await Sidequest.build(StepTwoJob).enqueue(result.id, result.processedData);
  }
}
```

For large payloads, store intermediate results in the database and pass only an ID.
