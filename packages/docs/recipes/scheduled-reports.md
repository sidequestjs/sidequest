---
title: Scheduled Reports
description: Generate and deliver reports on a recurring schedule using Sidequest cron jobs.
---

# Scheduled Reports

Use `Sidequest.build(Job).schedule(cronExpression, ...args)` to run a job on a recurring schedule. Schedules are registered in memory at startup using `node-cron`.

## Daily report job

```typescript
// jobs/DailyReportJob.ts
import { Job } from "sidequest";

export class DailyReportJob extends Job {
  async run(recipientEmail: string) {
    const report = await generateReport({
      from: new Date(Date.now() - 24 * 60 * 60 * 1000),
      to: new Date(),
    });

    await sendMail({
      to: recipientEmail,
      subject: `Daily report — ${new Date().toLocaleDateString()}`,
      html: report.html,
    });

    return { rows: report.rowCount };
  }
}
```

```typescript
// worker.ts
import { Sidequest } from "sidequest";
import { DailyReportJob } from "./jobs/DailyReportJob.js";

await Sidequest.start({ ... });

// Run every day at 7am
Sidequest.build(DailyReportJob)
  .queue("reports")
  .unique({ period: "day" }) // safe with multiple worker instances
  .schedule("0 7 * * *", "reports@company.com");
```

The cron expression `"0 7 * * *"` fires at 07:00 every day. See [crontab.guru](https://crontab.guru/) for expression help.

## Multiple report schedules

```typescript
// Register all schedules in one place
function registerSchedules() {
  // Daily active users report — every day at 6am
  Sidequest.build(ActiveUsersReportJob)
    .queue("reports")
    .unique({ period: "day" })
    .schedule("0 6 * * *");

  // Weekly revenue report — every Monday at 8am
  Sidequest.build(WeeklyRevenueJob)
    .queue("reports")
    .unique({ period: "week" })
    .schedule("0 8 * * 1");

  // Monthly invoice — 1st of every month at 9am
  Sidequest.build(MonthlyInvoiceJob)
    .queue("reports")
    .unique({ period: "month" })
    .schedule("0 9 1 * *");
}

await Sidequest.start({ ... });
registerSchedules();
```

## Important: schedules are not persisted

::: warning
`schedule()` registers an in-memory `node-cron` task. If your worker process restarts, schedules must be re-registered. Always call your schedule registration code at startup, not lazily.
:::

If the process is down when a scheduled time fires, the job is simply not enqueued. Sidequest does not backfill missed runs.

## Multi-instance deduplication

With `unique({ period: "day" })`, only the first instance to enqueue the job wins. Subsequent enqueue attempts within the same period are silently ignored — the database enforces uniqueness via a constraint on the unique digest.

Without `unique()`, every running worker instance would create a separate job at 07:00.

## Running a report on demand

Scheduled jobs are regular jobs — you can also enqueue them manually from the dashboard or via code:

```typescript
// Trigger an immediate report outside the normal schedule
await Sidequest.build(DailyReportJob)
  .queue("reports")
  .enqueue("on-demand@company.com");
```
