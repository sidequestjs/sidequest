---
outline: deep
title: Execution and Control
description: How run() works, runtime metadata, and the flow control methods for driving a job through its lifecycle.
---

# Execution and Control

The `run()` method is the entry point for your job's logic. Sidequest calls it when the job is claimed from the queue. Inside it, you write the work — and you use **flow control methods** to explicitly drive the job into the next lifecycle state when the default behavior (return = completed, throw = retry/failed) isn't expressive enough.

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

By default:

- **Return a value** → job transitions to `completed`, return value stored as `result`.
- **Throw an error** → job transitions back to `waiting` for retry (if attempts remain) or to `failed` (if not). Error stored in `errors`.

When you need finer control — fail without retrying, retry with a custom delay, pause until later — use the flow control methods below.

## Runtime metadata

Before `run()` executes, Sidequest injects read-only properties onto `this`:

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

## Flow control

These methods let you explicitly transition the job to a specific lifecycle state from inside `run()`. Each one is a convenient shorthand for a state transition — hence the name "convenience methods" you may see in older docs.

::: danger
You must **`return`** the result of every flow control method. Calling one without returning it is a no-op — the transition won't happen.

```typescript
this.fail("reason");        // ❌ does nothing
return this.fail("reason"); // ✅ transitions to failed
```
:::

### `return this.complete(result)`

Explicitly transition the job to `completed` with a given result. Functionally equivalent to a plain `return`, but useful when branching:

```typescript
async run(data: unknown) {
  if (!isValid(data)) {
    return this.complete({ skipped: true, reason: "invalid input" });
  }
  return this.complete(await process(data));
}
```

### `return this.fail(reason)`

Immediately transition the job to `failed`, bypassing any remaining retry attempts. Use this when the error is permanent and retrying would be pointless:

```typescript
async run(userId: string) {
  const user = await db.users.findById(userId);
  if (!user) {
    return this.fail(`User ${userId} not found`);
  }
  await processUser(user);
}
```

`reason` can be a string or an `Error` object — stored in the job's `errors` field.

### `return this.retry(reason, delay?)`

Explicitly request a retry with an optional delay in milliseconds. Unlike throwing, this lets you control the retry delay independently of the global `retryDelay` config:

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

`retry()` consumes a retry attempt. If this is the last attempt, the job transitions to `failed`.

### `return this.snooze(delay)`

Transition the job back to `waiting` and make it available again after `delay` milliseconds. Unlike `retry()`, **snooze does not consume a retry attempt** — it's a lifecycle pause, not a failure:

```typescript
async run(payload: unknown) {
  if (!isBusinessHours()) {
    return this.snooze(msUntilNextBusinessHour()); // come back when the office opens
  }
  return await processPayload(payload);
}
```

Use `snooze` for time-based deferrals: rate limit windows, maintenance modes, business hours.

## Choosing the right method

| Situation | Use |
|---|---|
| Normal completion | `return result` or `return this.complete(result)` |
| Permanent, unrecoverable error | `return this.fail(reason)` |
| Transient error, controlled retry delay | `return this.retry(reason, delay)` |
| Not the right time — try again later | `return this.snooze(delay)` |
| Unexpected error — let Sidequest decide | `throw error` |

## Best practices

- Make jobs **idempotent** — safe to run more than once with the same arguments.
- Use `fail()` for errors that won't resolve on retry. Use `throw` or `retry()` for transient ones.
- Keep `run()` focused on a single responsibility. Use [job chaining](/recipes/chaining) for multi-step workflows.
- Add [logging](/guide/jobs/logging) for key events so failures are debuggable from the dashboard.

---

**Next:** [Enqueueing Jobs](/guide/jobs/enqueueing) — the `JobBuilder` fluent API
