---
outline: deep
title: The run() Method
description: Implementing run(), returning values, handling errors, and using convenience methods inside a job.
---

# The run() Method

The `run()` method is the entry point for your job's logic. Sidequest calls it when the job is claimed from the queue.

## Basic implementation

`run()` receives the arguments you passed to `.enqueue()`:

```typescript
import { Job } from "sidequest";

export class ProcessOrderJob extends Job {
  async run(orderId: number, options: ProcessingOptions) {
    const order = await db.orders.findById(orderId);
    await fulfillOrder(order, options);
    return { orderId, fulfilledAt: new Date() };
  }
}
```

Anything you `return` is stored as the job's `result` and the job transitions to `completed`.

If `run()` throws, the job transitions to `failed` (if no retries remain) or back to `pending` (if retries remain). The error is stored in the job's `errors` field.

## Runtime metadata

After the job is created but before `run()` executes, Sidequest injects read-only properties onto `this`:

| Property            | Type        | Description                      |
| ------------------- | ----------- | -------------------------------- |
| `this.id`           | `string`    | Job ID                           |
| `this.attempt`      | `number`    | Current attempt number (1-based) |
| `this.max_attempts` | `number`    | Maximum allowed attempts         |
| `this.queue`        | `string`    | Queue the job is running in      |
| `this.state`        | `string`    | Current state (`"running"`)      |
| `this.inserted_at`  | `Date`      | When the job was first enqueued  |
| `this.args`         | `unknown[]` | The run arguments                |

::: warning
These properties are only available inside `run()`. They are `undefined` in the constructor.
:::

## Convenience methods

Inside `run()`, you can call four methods to control the job's outcome. **You must `return` them** — calling without returning is a no-op.

### `return this.complete(result)`

Explicitly mark the job as completed with a specific result. Equivalent to a plain `return`, but useful when you want to be explicit or when branching:

```typescript
async run(data: unknown) {
  if (!isValid(data)) {
    return this.complete({ skipped: true, reason: "invalid input" });
  }
  const result = await process(data);
  return this.complete(result);
}
```

### `return this.fail(reason)`

Mark the job as permanently failed, bypassing any remaining retry attempts. Use this for errors that will never succeed on retry (missing resource, validation failure, hard bounce):

```typescript
async run(userId: string) {
  const user = await db.users.findById(userId);
  if (!user) {
    return this.fail(`User ${userId} not found`); // no point retrying
  }
  await processUser(user);
}
```

`reason` can be a string or an `Error` object. It is stored in the job's `errors` field.

### `return this.retry(reason, delay?)`

Force a retry with an optional delay in milliseconds. Unlike throwing an error, `retry()` gives you control over the delay independently of the global `retryDelay` setting:

```typescript
async run(endpoint: string) {
  const response = await fetch(endpoint);

  if (response.status === 429) {
    const retryAfter = parseInt(response.headers.get("Retry-After") ?? "30") * 1000;
    return this.retry("Rate limited", retryAfter);
  }

  if (!response.ok) {
    return this.fail(`HTTP ${response.status} — not retrying`);
  }

  return await response.json();
}
```

`retry()` consumes a retry attempt. If you're already on the last attempt, the job fails.

### `return this.snooze(delay)`

Move the job back to `pending` and make it available again after `delay` milliseconds. Unlike `retry()`, **snooze does not consume a retry attempt** — it's a pause, not a failure:

```typescript
async run(payload: unknown) {
  if (!isBusinessHours()) {
    const msUntilOpen = msUntilNextBusinessHour();
    return this.snooze(msUntilOpen); // try again when the office opens
  }
  return await processPayload(payload);
}
```

Use `snooze` for timing-based deferrals (rate limits with long windows, business hours, external maintenance windows).

## Choosing the right method

| Situation                                   | Method                                                  |
| ------------------------------------------- | ------------------------------------------------------- |
| Permanent, unrecoverable error              | `return this.fail(reason)`                              |
| Transient error with controlled retry delay | `return this.retry(reason, delay)`                      |
| Not time yet — try again later              | `return this.snooze(delay)`                             |
| Normal completion                           | plain `return result` or `return this.complete(result)` |
| Unexpected error — let Sidequest retry      | `throw error`                                           |

## Best practices

- Make jobs **idempotent** — safe to run more than once with the same arguments.
- Distinguish **permanent failures** (use `fail()`) from **transient ones** (throw or use `retry()`).
- Keep `run()` focused on one task. Use [job chaining](/recipes/chaining) for multi-step workflows.
- Add [logging](/guide/jobs/logging) for key events so you can debug failures from the dashboard.
- For large payloads, store intermediate results in the database and pass only an ID between jobs.

---

**Next:** [Enqueueing Jobs](/guide/jobs/enqueueing) — the `JobBuilder` fluent API
