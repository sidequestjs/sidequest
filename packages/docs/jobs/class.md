---
outline: deep
title: Job Class
description: Jobs Class guide for Sidequest.js
---

# Job Class

A job must extend the `Job` class from Sidequest.js. The job class defines the work to be performed and provides the structure for job execution.
By extending this class and implementing the `run` method, you define the logic that will be executed when the job is processed and Sidequest will take care of the lifecycle management, including retries, error handling, and state transitions.

## Basic Job Structure

Every job class must:

1. Extend the `Job` base class
2. Implement a `run` method that contains the job logic
3. Be exported from a module so it can be dynamically imported

```typescript
import { Job } from "@sidequest/engine";

export class MyJob extends Job {
  async run(arg1: string, arg2: number) {
    // Your job logic here
    console.log(`Processing ${arg1} with value ${arg2}`);
    return { processed: true, result: arg1.toUpperCase() };
  }
}
```

## Constructor Parameters

Jobs can accept constructor parameters for configuration or dependencies:

```typescript
import { Job } from "@sidequest/engine";

export class EmailJob extends Job {
  constructor(
    private emailService: EmailService,
    private config: EmailConfig,
  ) {
    super();
  }

  async run(to: string, subject: string, body: string) {
    await this.emailService.send({
      to,
      subject,
      body,
      from: this.config.defaultSender,
    });
    return { emailSent: true, timestamp: new Date() };
  }
}
```

## Job Script Detection

Sidequest automatically detects the file path of your job class using stack trace analysis. This means:

- Jobs must be defined in their own files or imported modules
- The class must be exported (named or default export)
- Script files must be compiled to JavaScript if using TypeScript
  ::: tip
  If you are using [Node.js >= v23.6.0](https://nodejs.org/en/learn/typescript/run-natively), you can run TypeScript jobs directly without pre-compiling them to JavaScript.
  :::
- The file must be accessible at runtime by the Sidequest engine
  ::: warning
  If you are distributing Sidequest in multiples machines, the script file path must be consistent across all machines, otherwise the engine won't be able to find the job script.
  :::
- Dependencies must be accessible in the job's context

By using this strategy, you do not need to manually specify the job script path when enqueuing jobs. Sidequest will automatically resolve it based on the class definition. If you are using TypeScript, this also allows Sidequest.js to provide type safety for the jobs when enqueueing them.

However, if you still want to control the importing/exporting of job classes manually, you can use the [Manual Job Resolution](/jobs/manual-resolution/) feature.

## Job Data Properties

During the job execution, jobs can access various properties that provide context about the job execution. These properties come from the database and follow the JobData interface, as explained in the [Job Metadata Section](/jobs/#job-metadata). For convenience, here is the interface definition:

<<< ../../core/src/schema/job-data.ts#JobData{}

You can access these properties directly in your job run method using `this`:

```typescript
import { Job } from "@sidequest/engine";

export class MyJob extends Job {
  async run() {
    console.log(`Job ID: ${this.id}`);
    console.log(`Job State: ${this.state}`);
    console.log(`Job Inserted At: ${this.inserted_at}`);
  }
}
```

::: warning
These properties are read-only and should not be modified directly. They are provided for informational purposes and to help with job logic. If you modify them, it will not affect the job's state in the database.
:::

::: warning
Sidequest injects these properties in runtime and **only after creating the job object**. They will only be available after the job starts executing, so you cannot access them in the constructor or before the `run` method is called.
:::

## Class Naming Conventions

While not required, following these conventions helps with organization:

- Use descriptive names ending in "Job": `SendEmailJob`, `ProcessPaymentJob`
- Use PascalCase for class names
- Group related jobs in the same directory or module

## Best Practices

1. **Keep jobs focused**: Each job should have a single responsibility
2. **Make jobs idempotent**: Jobs should be safe to retry
3. **Use meaningful return values**: Return data that might be useful for debugging or downstream processing
4. **Handle dependencies carefully**: Consider how to provide services and configurations to your jobs
5. **Add proper logging**: Use the [built-in logger](./logging.md) for debugging and monitoring
6. **Validate inputs**: Check that required arguments are present and valid
