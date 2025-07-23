---
outline: deep
title: Logging
description: Logging guide for Sidequest.js
---

# Logging

Sidequest uses Winston for structured logging. You can also use the logger in your jobs to log messages:

```typescript
import { Job, logger } from "sidequest";

// In your job
export class MyJob extends Job {
  run(data) {
    logger().info("Processing job", { data });
    // ... job logic
    logger().info("Job completed successfully");
    return { success: true, timestamp: new Date() };
  }
}
```
