import { logger } from "../logger";
import { JobData } from "../schema";
import { ErrorData } from "../schema/error-data";
import { serializeError } from "../tools";
import { JobTransition } from "./transition";

export class RetryTransition extends JobTransition {
  delay: number;
  reason: string | Error;

  constructor(reason: Error | string, delay?: number) {
    super();
    this.delay = delay ?? 1000;
    this.reason = reason;
  }

  apply(job: JobData): JobData {
    logger().error(this.reason);

    const delay = this.delay ?? this.calculateBackoff(job.attempt);
    logger().info(`retrying failed job ${job.class} in ${delay}ms`);

    const reason = this.reason instanceof Error ? serializeError(this.reason) : ({ message: this.reason } as ErrorData);
    const errData = {
      ...reason,
      attempt: job.attempt,
      attempted_at: job.attempted_at,
      attempt_by: job.claimed_by,
    };

    job.errors ??= [];
    job.errors.push(errData);

    if (job.attempt >= job.max_attempts) {
      job.state = "failed";
    } else {
      job.state = "waiting";
      job.available_at = new Date(Date.now() + delay);
    }
    return job;
  }

  private calculateBackoff(attempt: number, baseDelay = 1000, maxDelay = 3600000): number {
    const jitter = Math.random() + 0.5;
    return Math.min(baseDelay * Math.pow(2, attempt - 1) * jitter, maxDelay);
  }
}
