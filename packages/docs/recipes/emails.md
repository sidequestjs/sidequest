---
title: Sending Emails
description: Reliably send emails with Sidequest — retry on failure, deduplicate welcome emails, and schedule digests.
---

# Sending Emails

Email sending is the canonical background job use case: you want HTTP responses to return fast, not wait on an SMTP server. Here's how to do it well with Sidequest.

## Basic email job

```typescript
// jobs/SendEmailJob.ts
import { Job } from "sidequest";
import { sendMail } from "../lib/mailer.js"; // your email lib (Nodemailer, Resend, etc.)

export class SendEmailJob extends Job {
  async run(to: string, subject: string, body: string) {
    await sendMail({ to, subject, html: body });
    return { sent: true, to };
  }
}
```

```typescript
// Enqueue from your route handler
import { Sidequest } from "sidequest";
import { SendEmailJob } from "./jobs/SendEmailJob.js";

// In your POST /register handler:
await db.users.create({ email, name }); // create the user first
await Sidequest.build(SendEmailJob)
  .queue("emails")
  .maxAttempts(3)
  .retryDelay(5000) // wait 5s before first retry
  .enqueue(email, "Welcome to Acme!", "<h1>Thanks for signing up</h1>");
```

The job retries up to 3 times if the SMTP server is unreachable. The HTTP handler returns immediately after enqueue.

## Prevent duplicate welcome emails

If your route can be called twice (retried client, duplicate form submission), you might send the same welcome email twice. Use `unique()` to prevent that:

```typescript
await Sidequest.build(SendEmailJob)
  .queue("emails")
  .maxAttempts(3)
  .unique({ key: `welcome:${userId}`, ttl: 24 * 60 * 60 * 1000 }) // deduplicate for 24h
  .enqueue(email, "Welcome!", body);
```

If the same key is enqueued again within the TTL window, the second call is silently ignored.

## Scheduled digest email

```typescript
// jobs/WeeklyDigestJob.ts
import { Job } from "sidequest";

export class WeeklyDigestJob extends Job {
  async run() {
    const users = await db.users.findAll({ where: { notifications: true } });
    for (const user of users) {
      const digest = await buildDigest(user);
      await sendMail({ to: user.email, subject: "Your weekly digest", html: digest });
    }
  }
}
```

```typescript
// worker.ts — register the schedule at startup
await Sidequest.start({ ... });

Sidequest.build(WeeklyDigestJob)
  .queue("emails")
  .unique({ period: "week" }) // only one run per week across all instances
  .schedule("0 9 * * 1"); // every Monday at 9am
```

The `unique({ period: "week" })` ensures that even with multiple worker instances, only one digest job is created per week.

## Retry with exponential backoff

For transient SMTP failures, exponential backoff avoids hammering a struggling mail server:

```typescript
await Sidequest.build(SendEmailJob)
  .queue("emails")
  .maxAttempts(5)
  .retryDelay(10000) // 10s base delay
  .backoffStrategy("exponential") // 10s, 20s, 40s, 80s, 160s
  .enqueue(to, subject, body);
```

## Handling permanent failures

If an email address is invalid (hard bounce), retrying is pointless. Return `this.fail()` from inside `run()` to mark the job as permanently failed without consuming remaining attempts:

```typescript
async run(to: string, subject: string, body: string) {
  try {
    await sendMail({ to, subject, html: body });
  } catch (error) {
    if (isHardBounce(error)) {
      return this.fail(`Hard bounce for ${to}: ${error.message}`);
    }
    throw error; // let Sidequest retry transient errors
  }
}
```
