---
outline: deep
title: Manual Job Resolution
description: Manual Job Resolution guide for Sidequest.js
---

# Manual Job Resolution

Manual Job Resolution is a deployment and bundling strategy for Sidequest.js that gives you complete control over how job classes are resolved and imported at runtime. Instead of relying on [automatic script path detection](/jobs/class#job-script-detection), you can manually specify which job classes are available through a central registry file.

## What is Manual Job Resolution?

By default, Sidequest.js automatically detects and imports job scripts based on their file paths. While this works well for development, it can cause issues in production environments with:

- **Bundled applications** (webpack, esbuild, rollup, etc.)
- **Containerized deployments** where file paths may change
- **Serverless functions** with restricted file system access
- **Complex monorepo structures** with dynamic import paths

Manual Job Resolution solves these issues by using a single `sidequest.jobs.js` file that explicitly exports all available job classes.
Therefore, you can compile your jobs separately and re-export them wherever they are needed.

Moreover, this approach clears the chain of `../../../../` relative imports in the job scripts, which can be hard to manage and debug in large projects.
When you see `sidequest.jobs.js` as the job script, it indicates that the job class will be resolved from the central registry file instead of a specific file path.

## How It Works

When manual job resolution is enabled:

1. **Config Override (optional)**: If `paths.start` is set, Sidequest loads that file directly.
2. **Job Execution (default search)**: Otherwise, the runner looks for a `sidequest.jobs.js` file in the current directory or any parent directory.
3. **Class Resolution**: Job classes are imported from the central registry file instead of individual script files.

## Setting Up Manual Job Resolution

### Step 1: Enable Manual Resolution

Configure your Sidequest engine to use manual job resolution:

```typescript
import { Sidequest } from "@sidequest/engine";

// or Sidequest.configure
await Sidequest.start({
  backend: { driver: "@sidequest/sqlite-backend" },
  queues: [{ name: "default" }],
  manualJobResolution: true, // Enable manual job resolution

  // Optional: explicitly point to your compiled registry file
  // Useful when the file lives in dist/build or a non-standard location
  // paths: { start: "./dist/sidequest.jobs.js" },
});
```

### Step 2: Create the Job Registry

Create a `sidequest.jobs.js` file in your project root (or any parent directory):

```javascript
// sidequest.jobs.js
import { EmailJob } from "./src/jobs/email-job.js";
import { ProcessImageJob } from "./src/jobs/process-image-job.js";
import { GenerateReportJob } from "./src/jobs/generate-report-job.js";
import { CleanupJob } from "./src/jobs/cleanup-job.js";

// Export all job classes
export { EmailJob, ProcessImageJob, GenerateReportJob, CleanupJob };
```

### Step 3: Enqueue Jobs Normally

Job enqueuing works exactly the same way - Sidequest automatically handles the resolution:

```typescript
// Jobs will use manual resolution automatically
await Sidequest.build(EmailJob).enqueue("user@example.com", "Welcome!", "Hello world");
await Sidequest.build(ProcessImageJob).with(imageProcessor).enqueue("/path/to/image.jpg");
```

### Step 4: Using a Custom Jobs File Path

If your registry file is emitted to a non-standard location (e.g. `dist/`), set `paths.start`:

```typescript
await Sidequest.start({
  backend: { driver: "@sidequest/postgres-backend", config: "postgres://..." },
  manualJobResolution: true,
  paths: {
    start: "./dist/sidequest.jobs.js", // direct path to the registry file
  },
});
```

## File Discovery

Sidequest searches for the `sidequest.jobs.js` file using the following strategy:

0. **Explicit Override**: If `paths.start` is provided, use that file directly.
1. **Current Working Directory**: Starts from `process.cwd()`
2. **Parent Traversal**: Walks up the directory tree checking each parent directory
3. **Root Directory**: Stops when it reaches the file system root
4. **Error Handling**: Throws an error if no file is found

When a worker finds a job with `script: "sidequest.jobs.js"`, it uses this file to resolve the job class.
In cases where multiple projects are running with Sidequest enabled and you are enqueueing jobs with manual resolution activated, ensure each project has its own `sidequest.jobs.js` in its root or parent directory.

For example, if you have two projects:

```text
.
└── My Projects/
    ├── api/
    │   └── server.js // this enqueues jobs
    └── worker/
        ├── jobs/
        │   ├── MyJob.js
        │   └── MyOtherJob.js
        ├── worker.js // this runs jobs
        └── sidequest.jobs.js // re-export MyJob and MyOtherJob here
```

Notice how `sidequest.jobs.js` is placed in the `worker/` directory, not in `api/`. This ensures that when the worker process starts, it can find the job classes it needs. The enqueuer does not need to find this file, as it only needs to enqueue jobs.

If you prefer, you can create a single `sidequest.jobs.js` file at a higher level in your directory structure that exports job classes from multiple projects. Because Sidequest searches up the directory tree, just ensure that all job classes used by any project are included in that single registry file.

For example:

```text
.
└── My Projects/
    ├── api/
    │   └── server.js // this enqueues jobs
    ├── worker-project/
    │   ├── jobs/
    │   │   ├── MyJob.js
    │   │   └── MyOtherJob.js
    │   └── worker.js // this runs jobs
    ├── another-worker-project/
    │   ├── jobs/
    │   │   └── EmailJob.js
    │   └── worker.js // this runs jobs
    └── sidequest.jobs.js // re-export MyJob, MyOtherJob, EmailJob.js here
```

In this case, since `sidequest.jobs.js` is at the `My Projects/` level, both worker projects can find it when they start up.
If this file exports all job classes used by both projects, everything will work seamlessly.

## Best Practices

### 1. Consistent Export Strategy

Use a consistent approach for exporting your job classes:

```javascript
// sidequest.jobs.js
import { EmailJob } from "./src/jobs/email-job.js";
import { ProcessImageJob } from "./src/jobs/process-image-job.js";

// Named exports
export { EmailJob, ProcessImageJob };
```

### 2. Organize Job Imports

For large applications, organize your imports:

```javascript
// sidequest.jobs.js
// Email-related jobs
import { WelcomeEmailJob } from "./src/jobs/email/welcome-email-job.js";
import { NewsletterJob } from "./src/jobs/email/newsletter-job.js";

// Image processing jobs
import { ResizeImageJob } from "./src/jobs/images/resize-image-job.js";
import { OptimizeImageJob } from "./src/jobs/images/optimize-image-job.js";

// Report generation jobs
import { DailyReportJob } from "./src/jobs/reports/daily-report-job.js";
import { MonthlyReportJob } from "./src/jobs/reports/monthly-report-job.js";

export {
  // Email jobs
  WelcomeEmailJob,
  NewsletterJob,

  // Image jobs
  ResizeImageJob,
  OptimizeImageJob,

  // Report jobs
  DailyReportJob,
  MonthlyReportJob,
};
```

### 3. Environment-Specific Configuration

Configure manual resolution based on your environment:

```typescript
// config.ts
const isProduction = process.env.NODE_ENV === "production";
const isBundled = process.env.BUNDLED === "true";

await Sidequest.start({
  backend: getBackendConfig(),
  queues: getQueueConfig(),
  manualJobResolution: isProduction || isBundled,
});
```

### 4. Testing Manual Resolution

Test your manual resolution setup:

```typescript
// test/manual-resolution.test.ts
import { describe, test, expect } from "vitest";

describe("Manual Job Resolution", () => {
  test("should find sidequest.jobs.js file", async () => {
    const { findSidequestJobsScriptInParentDirs } = await import("@sidequest/engine/manual-loader");

    expect(() => {
      findSidequestJobsScriptInParentDirs();
    }).not.toThrow();
  });

  test("should export required job classes", async () => {
    const jobs = await import("../sidequest.jobs.js");

    expect(jobs.EmailJob).toBeDefined();
    expect(jobs.ProcessImageJob).toBeDefined();
    // ... test all your exported jobs
  });
});
```

### 5. Keep the Registry Updated

Regularly update `sidequest.jobs.js` as you add or remove job classes to ensure all jobs are available for resolution.
If you move a job class to a different file, remember to update the import path in `sidequest.jobs.js`.

## Troubleshooting

### Common Issues

#### Start Path Override Not Found

```text
Error: Start path override "./dist/sidequest.jobs.js" not found
```

#### File Not Found Error

```text
Error: File "sidequest.jobs.js" not found in "/app/dist" or any parent directory
```

**Solution**: Ensure `sidequest.jobs.js` is included in your build output and deployment.

#### Invalid Job Class Error

```text
Error: Invalid job class: EmailJob
```

**Solution**: Verify the job class is exported from `sidequest.jobs.js`:

```javascript
// Make sure this export exists
export { EmailJob } from "./src/jobs/email-job.js";
```

#### Import Path Issues

```text
Error: Cannot find module './src/jobs/email-job.js'
```

**Solution**: Use correct relative paths in your `sidequest.jobs.js` file based on where it's located.

### Debugging Tips

1. **Verify File Location**: Check that `sidequest.jobs.js` is in the expected location
2. **Test Imports**: Manually test importing your jobs file: `node -e "console.log(require('./sidequest.jobs.js'))"`
3. **Check Export Names**: Ensure job class names match exactly between enqueue calls and exports
4. **Enable Debug Logging**: Use debug-level logging to see resolution attempts

```typescript
await Sidequest.start({
  // ... config
  logger: { level: "debug" }, // Shows manual resolution debug info
});
```

## Migration Guide

### From Automatic to Manual Resolution

1. **Create the Registry File**: Add `sidequest.jobs.js` with all your job exports
2. **Enable Manual Resolution**: Set `manualJobResolution: true` in your engine config
3. **Test Thoroughly**: Verify all jobs can be enqueued and executed
4. **Update Deployment**: Ensure the registry file is included in your deployment artifacts and any worker that uses Sidequest

**Tip:** If your CI/CD emits the registry file to a build folder, set `paths.start` to that compiled file so workers don’t rely on source-tree layout.