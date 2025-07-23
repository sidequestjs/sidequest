---
outline: deep
title: Enqueueing Jobs
description: How to enqueue jobs in Sidequest.js
---

# Enqueueing Jobs

```typescript
// Somewhere in your application
import { Sidequest } from "sidequest";
import { EmailJob } from "./jobs/EmailJob.js";

// Simple job
await Sidequest.build(EmailJob).enqueue("user@example.com", "Welcome!", "Thanks for signing up!");

// Build a Job with options
await Sidequest.build(EmailJob)
  // If the queue does not exist, it will be created automatically
  .queue("emails")
  // Timeout after 30 seconds
  .timeout(30000)
  // Prevent duplicate jobs
  .unique()
  // Retry up to 5 times in case of failures
  .maxAttempts(5)
  // Available for running at a specific date and time
  .availableAt(new Date(2025, 7, 17))
  // Magically typed if EmailJob is written in TypeScript
  .enqueue("user@example.com", "Weekly Report", "Your weekly summary...");
```
