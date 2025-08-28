---
outline: deep
title: FAQ
description: Frequently Asked Questions for Sidequest.js
---

# Frequently Asked Questions (FAQ)

This page offers answers to some of the most common questions about Sidequest.js. If you have a question that isn't covered here, we ask you to take a closer look at the [documentation](/overview) - usually your question is answered there. However, if you still haven't got an answer to your doubt, please feel free to [open an issue](https://github.com/sidequestjs/sidequest/issues).

## What is Sidequest.js?

Sidequest is an open-source, modern, scalable distributed background job processor for Node.js applications.

## What is a Queue?

Each queue is a separate logical channel, with its own concurrency, priority, and state configuration.

More info: [Queues Documentation](/queues)

## What is a Job?

A job in Sidequest.js is a unit of work that can be executed asynchronously. Jobs are stored in a backend (database) and processed by workers in a queue-based system.

More info: [Jobs Documentation](/jobs)

## Can I use Sidequest without a dashboard?

Absolutely. To do so, pass a configuration object to the `Sidequest.start` with the `dashboard.enabled` property set to `false`.

```typescript
await Sidequest.start({
  dashboard: {
    enabled: false,
  },
});
```

More info: [Dashboard Documentation](/dashboard)

## Can I use Sidequest without processing jobs - no workers?

Yes, you can start Sidequest without processing jobs by using `Sidequest.configure(...)`. This will enable you to enqueue jobs without starting any workers.

More info: [Engine Documentation](/engine)

## Can I start only the Dashboard?

Of course. Here's an example of how to start only the Dashboard:

```typescript
import { SidequestDashboard } from "@sidequest/dashboard";

const dashboard = new SidequestDashboard();

await dashboard.start({
  enabled: true,
  port: 8678,
  backendConfig: {
    driver: "@sidequest/postgres-backend",
    config: "postgresql://localhost:5432/sidequest",
  },
});
```

More info: [Starting only the Dashboard](/dashboard#starting-only-the-dashboard)

## Can I use Sidequest without a database?

No. You need a database to store information about jobs, queues, and their states.

More info: [Backend Documentation](/engine/backends)

## Which databases are supported by Sidequest.js?

PostgreSQL, MongoDB, MySQL, and SQLite. We recommend PostgreSQL for production use.

More info: [Backend Documentation](/engine/backends)

## How does Sidequest load my job script?

Sidequest.js uses dynamic imports to load your job scripts. By specifying the job's type during `Sidequest.build`, Sidequest will automatically fin the script and load it.

More info: [Job Script Detection](/jobs/class#job-script-detection)

## Can I run a function directly as a job?

No. Sidequest requires you to create a job class that extends the `Job` base class. This ensures that your job has the necessary structure and methods to be processed correctly.

More info: [Job Class](/jobs/class)

## Sidequest is not finding my job script, what do I do?

Well, in this case, maybe your job is compiled and bundled differently than expected. If you are using Nuxt, Next.js, or something similar, the tool might be bundling your job into a script where it is inaccessible. For now, Sidequest does not support these frameworks out of the box. You can work around it by creating a separate module or package for your jobs, compiled without those frameworks or doing a few shenanigans to make it work.

You can probably find a few workarounds [like this](https://github.com/sidequestjs/sidequest/issues/86) in the [issues](https://github.com/sidequestjs/sidequest/issues) section of our repository.

## My Sidequest instances are running jobs from all queues, how do I restrict them?

There is no way to restrict a Sidequest instance to only process jobs from specific queues. However, you can achieve this by starting multiple Sidequest instances, each with a different database. This feature will be included in [Sidequest Pro](https://sidequestjs.com/plans/) though 🙂

## My lower priority queues are not being processed, what do I do?

Sidequest processes jobs based on their priority. If you have high-priority queues with a lot of jobs, they may be consuming all the available worker capacity, leaving no room for lower-priority queues. [Sidequest Pro](https://sidequestjs.com/plans/) will implement a few strategies to mitigate this issue.

## How do I see the result of a job?

You can use the job operations from the `Sidequest` class to fetch the job and check its result.

```typescript
const job = await Sidequest.job.get(jobId);
console.log(job.result);
```

More info: [Using Sidequest.job and Sidequest.queue](/engine/#using-sidequest-job-and-sidequest-queue)

## I have jobs in the `running` state, but no workers are running. What do I do?

Sidequest will automatically clear stale jobs in the `running` state after a certain timeout. This timeout is configurable via config options passed to `Sidequest.start` or `Sidequest.configure`. You can also manually clear them if you like.

More info: [Stale Job Recovery](/engine/graceful-shutdown#stale-job-recovery)

## What is a scheduled/recurring job?

A scheduled/recurring job is a job that is set to run at specific intervals or times, defined by a cron expression. This allows you to automate tasks that need to be performed regularly without manual intervention.

However, scheduled jobs are a bit different from regular jobs. When you call `Sidequest.build(MyJob).schedule("* * * * *")`, Sidequest creates a cron that, when executed, will enqueue a new instance of `MyJob`. This means that the scheduled job itself is not the one doing the work; instead, it acts as a trigger to create and enqueue the actual job you want to run.

Scheduled jobs (crons) are not persisted in the database, even though the jobs they create are. If you restart your Sidequest instance, you will need to re-register your scheduled jobs to ensure they continue to run as expected.

More info: [.schedule](/engine/enqueue#schedule-cronexpression-string-args-unknown)

## Is Sidequest.js free to use?

Yes, Sidequest.js is 100% free and open-source under the LGPL-3.0 license.

## How can I contribute to Sidequest.js?

Great question! We welcome contributions from the community. You can contribute by reporting issues, suggesting features, or submitting pull requests on our [GitHub repository](https://github.com/sidequestjs/sidequest). Check out our [contributing guidelines](https://github.com/sidequestjs/sidequest/blob/master/CONTRIBUTING.md) for more details.

## But Senpai, I have a question that isn't answered here!

If your question isn't covered in this FAQ, please take a closer look at the [documentation](/overview). Try using the search functionality up top as well. If you still haven't got an answer to your doubt, feel free to [open an issue](https://github.com/sidequestjs/sidequest/issues), but please make sure to check if your question has already been asked before.
