---
outline: deep
title: Quick Start
description: Quick start guide for Sidequest.js
---

# Quick Start Guide

This guide will help you quickly set up Sidequest.js in your Node.js application.

## 1. Installation

To install Sidequest.js, check out [Installation Guide](/installation).
If you are strictly following this quick start, you should install the SQLite backend driver, which is the default backend for Sidequest.js.

## 2. Job Creation

The first step is to create a [Job](/jobs/index) class. This class will define the job's behavior and can be customized as needed.

```typescript
// jobs/EmailJob.js
import { Job } from "sidequest";

export class EmailJob extends Job {
  async run(to, subject, body) {
    console.log(`Sending email to ${to}: ${subject}`);
    // Your email sending logic here
    return { sent: true, timestamp: new Date() };
  }
}
```

## 3. Sidequest Startup

The next step is to configure and start the [Sidequest engine](/engine/index). You can use the default settings or customize it according to your needs.

```typescript
// app.js
import { Sidequest } from "sidequest";

// Quick start Sidequest with default settings and Dashboard enabled
await Sidequest.start();

console.log("Sidequest started! Dashboard: http://localhost:8678");
```

## 4. Enqueue Jobs

Now that you have your job class and Sidequest is running, you can [enqueue jobs](/engine/enqueue) to be processed.

```typescript
// Somewhere in your application
import { Sidequest } from "sidequest";
import { EmailJob } from "./jobs/EmailJob.js";

// Simple job
await Sidequest.build(EmailJob).enqueue("user@example.com", "Welcome!", "Thanks for signing up!");
```

## 5. Check the Dashboard

You can access the [Sidequest Dashboard](/dashboard) at `http://localhost:8678` to monitor your jobs, queues, and their statuses. The dashboard provides a user-friendly interface to manage and visualize your job processing.

## What's Next?

Now that you have a basic setup, you can explore more advanced features like:

- Learn about [Jobs](/jobs/index) and how to create custom job classes
- Learn about [Queues](/queues/index) and how to manage them
- Learn how to configure and run the [Sidequest Engine](/engine/index)
- Check [Sidequest's Dashboard](/dashboard) for monitoring and managing jobs

Check the rest of the documentation for detailed guides on these topics.
