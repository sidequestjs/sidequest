---
outline: deep
title: Job.run Method
description: Job.run method guide for Sidequest.js
---

# Job.run Method

The `run` method is the heart of every job - it contains the actual work to be performed. Understanding how to implement this method properly is crucial for building reliable job processing systems.

## Basic Implementation

The `run` method receives the arguments passed when the job was enqueued:

```typescript
import { Job } from "@sidequest/engine";

export class ProcessOrderJob extends Job {
  async run(orderId: number, options: ProcessingOptions) {
    // Your job logic here
    const order = await this.getOrder(orderId);
    await this.processOrder(order, options);

    return {
      orderId,
      processed: true,
      timestamp: new Date(),
    };
  }
}
```

## Return Values and Job Completion

Anything returned from the `run` method will be stored in the job's `result` field and the job will be marked as `completed`:

```typescript
export class CalculationJob extends Job {
  async run(numbers: number[]) {
    const sum = numbers.reduce((a, b) => a + b, 0);
    const average = sum / numbers.length;

    // This return value becomes the job result
    return {
      sum,
      average,
      count: numbers.length,
      calculatedAt: new Date(),
    };
  }
}
```

## Error Handling and Retries

If an error is thrown from the `run` method, the job will be marked as `failed` (if no more retry attempts are remaining) and the error will be stored in the job's `errors` field:

```typescript
export class ApiCallJob extends Job {
  async run(endpoint: string, data: any) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        // This will trigger a retry if attempts remain
        throw new Error(`API call failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      return { success: true, data: result };
    } catch (error) {
      // Log for debugging
      console.error(`API call to ${endpoint} failed:`, error);

      // Re-throw to trigger retry mechanism
      throw error;
    }
  }
}
```

## Job Retry Configuration

Jobs can be retried if they fail, and you can configure the number of attempts when enqueuing the job. Check our [job enqueueing guide](/engine/enqueue) for details on how to set retry attempts.

## Convenience Methods

The Job class provides several convenience methods that can be used inside the `run` method to control job execution.
Refer to our guide on [convenience methods](./convenience-methods.md) for more details on how to use these methods effectively.

## Best Practices

1. **Keep run methods focused**: Each job should have a single, well-defined responsibility
2. **Handle errors appropriately**: Distinguish between retryable and permanent failures
3. **Use meaningful return values**: Include useful information for debugging and monitoring
4. **Log important events**: Add [logging](./logging.md) for debugging and operational visibility
5. **Make jobs idempotent**: Ensure jobs can be safely retried without side effects
6. **Validate inputs**: Check that required arguments are present and valid
7. **Use convenience methods wisely**: Return their results to control job flow
