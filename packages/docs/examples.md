---
outline: deep
title: Examples
description: Practical examples demonstrating Sidequest.js features and common use cases
---

# Examples

This page showcases practical examples that demonstrate how to use Sidequest.js in real-world scenarios. Each example includes complete, runnable code that you can use as a starting point for your own applications.

## 1. Hello World

The simplest possible Sidequest example - creating and running a basic job.

**What it demonstrates:**

- Creating a basic job class
- Starting Sidequest with default configuration
- Enqueueing a job with parameters

### Job Class

<<< @/../../examples/01-hello-world/hello-job.ts

### Main Application

<<< @/../../examples/01-hello-world/index.ts

**Key concepts:**

- All jobs extend the `Job` base class
- The `run()` method contains your job logic
- Jobs can accept parameters and return values
- Sidequest starts with sensible defaults (SQLite backend, dashboard on port 8678)

## 2. Recurring Jobs

Schedule jobs to run automatically at specified intervals using cron expressions.

**What it demonstrates:**

- Using the `.schedule()` method instead of `.enqueue()`
- Cron expression syntax for job scheduling
- Setting up recurring background tasks

### Job Class

<<< @/../../examples/02-recurring-job/sample-job.ts

### Main Application

<<< @/../../examples/02-recurring-job/index.ts

**Key concepts:**

- Use `.schedule()` for recurring jobs instead of `.enqueue()`
- Cron expressions control when jobs run (this example runs every 10 seconds)
- Scheduled jobs are in-memory only and need to be re-registered on restart
- Scheduled jobs enqueue other jobs (those are persisted)
- Perfect for maintenance tasks, data processing, or periodic notifications

## 3. Job Snoozing

Implement jobs that can pause themselves and resume later, useful for waiting on external conditions.

**What it demonstrates:**

- Using `this.snooze()` to pause job execution
- Handling jobs that need to wait for external conditions
- Job lifecycle management

### Job Class

<<< @/../../examples/03-snooze-job/snooze-job.ts

### Main Application

<<< @/../../examples/03-snooze-job/index.ts

**Key concepts:**

- `this.snooze(milliseconds)` pauses a job and reschedules it for later
- Useful for rate limiting, waiting for external APIs, or implementing backoff strategies
- The job will be retried after the specified delay
- Snoozing doesn't count against the job's retry attempts

## 4. API-Triggered Jobs

Integrate Sidequest with a web API to enqueue jobs from HTTP requests.

**What it demonstrates:**

- Enqueueing jobs from within an Express.js application
- Asynchronous job processing triggered by user actions
- Separating web request handling from background processing

### Job Class

<<< @/../../examples/04-enqueue-job-from-api/send-email-job.ts

### Express Application

<<< @/../../examples/04-enqueue-job-from-api/index.ts

**Key concepts:**

- Jobs are enqueued asynchronously and don't block the HTTP response
- Use `void` when you don't need to wait for job completion
- This pattern is perfect for time-consuming tasks like sending emails, processing images, or generating reports
- The API responds immediately while work happens in the background

**Try it out:**

```bash
# Start the server
npm run start

# Trigger a job
curl "http://localhost:3000/send-email?email=test@example.com"
```

## 5. Web Scraping

A more complex example that demonstrates real-world job processing with external HTTP requests and data processing.

**What it demonstrates:**

- Jobs that make external HTTP requests
- Processing and parsing HTML data
- Returning structured results from jobs
- Using external dependencies (cheerio for HTML parsing)

### Job Class

<<< @/../../examples/05-web-scrapping/count-word-job.ts

### Main Application

<<< @/../../examples/05-web-scrapping/index.ts

**Key concepts:**

- Jobs can make external HTTP requests and process the responses
- Use `async/await` for asynchronous operations within jobs
- Return structured data that will be stored with the job results
- External libraries like `cheerio` can be used for data processing
- Perfect for data collection, content analysis, or API integration tasks
- If the job fails (e.g., rate limiting), it will be retried based on your configuration

## Running the Examples

All examples are located in the [`/examples` directory](https://github.com/sidequestjs/sidequest/tree/develop/examples) of the Sidequest repository. To run any example, navigate to Sidequest's root directory and run:

```bash
yarn install
```

Then build the examples:

```bash
yarn build:examples
```

Then run any example with:

```bash
node examples/dist/01-hello-world/index.js
```

### Viewing the Dashboard

All examples start the Sidequest dashboard automatically. You can view job execution in real-time:

```text
http://localhost:8678
```

The dashboard shows:

- Job execution status and history
- Queue management and statistics
- Real-time job processing metrics
- Job details including arguments and results

## Next Steps

After exploring these examples:

1. **Learn about [Job Classes](/jobs/index)** - Understand job lifecycle and advanced features
2. **Explore [Queue Management](/queues/index)** - Configure queues for different priorities and concurrency
3. **Read the [Configuration Guide](/engine/configuration)** - Customize Sidequest for your environment
4. **Check out the [Dashboard](/dashboard)** - Monitor and manage your jobs
5. **Review [Best Practices](/engine/graceful-shutdown)** - Production deployment considerations
