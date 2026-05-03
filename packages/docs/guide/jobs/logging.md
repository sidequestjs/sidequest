---
outline: deep
title: Logging
description: Logging guide for Sidequest.js
---

# Logging

Sidequest.js uses Winston for structured logging throughout the framework. You can also use the logger in your jobs to add debugging information, monitor execution, and track important events.

## Using the Logger in Jobs

Import and use the logger function to add logging to your jobs:

```typescript
import { Job, logger } from "@sidequest/core";

export class MyJob extends Job {
  async run(data: any) {
    const log = logger("MyJob"); // Create a logger instance with a label

    log.info("Processing job", { data });

    try {
      const result = await this.processData(data);
      log.info("Job completed successfully", { result });
      return result;
    } catch (error) {
      log.error("Job failed", { error: error.message, data });
      throw error;
    }
  }
}
```

Of course, the plain ol' `console.log` can be used here, but using the logger provides structured output and better integration with Sidequest's logging system.

## Logger Labels

Use descriptive labels to identify different components and job types:

```typescript
// Use job class name as label
const log = logger("EmailJob");

// Use more specific labels for complex jobs
const log = logger("PaymentProcessor.CreditCard");

// Include operation type
const log = logger("DataSync.ImportUsers");
```

## Log Levels

Different log levels serve different purposes:

### Error Level

Use for serious problems that prevent job completion:

```typescript
log.error("Database connection failed", {
  error: error.message,
  connectionString: this.sanitizeConnectionString(connectionString),
  retryAttempt: this.attempt,
});
```

### Warning Level

Use for recoverable issues or unexpected conditions:

```typescript
log.warn("API rate limit reached, will retry", {
  apiEndpoint: endpoint,
  retryAfter: retryAfterSeconds,
  attempt: this.attempt,
});
```

### Info Level

Use for important business events and job progress:

```typescript
log.info("Payment processed successfully", {
  paymentId: payment.id,
  amount: payment.amount,
  currency: payment.currency,
  userId: payment.userId,
});
```

### Debug Level

Use for detailed execution information (usually disabled in production):

```typescript
log.debug("Validating payment data", {
  paymentData: this.sanitizePaymentData(paymentData),
  validationRules: validationRules,
});
```

## Best Practices

1. **Use structured logging**: Include relevant context as metadata objects
2. **Choose appropriate log levels**: Error for failures, info for business events, debug for detailed tracing
3. **Sanitize sensitive data**: Never log passwords, API keys, or PII
4. **Include timing information**: Log start/end times and durations for performance monitoring
5. **Add job context**: Include job ID, attempt number, and other relevant identifiers
6. **Use consistent labels**: Use descriptive, consistent logger labels across your application
7. **Log business events**: Log important business outcomes, not just technical events
