import { logger } from "../logger";
import { JobData } from "../schema";
import { ErrorData } from "../schema/error-data";
import { toErrorData } from "../tools/parse-error-data";
import { JobTransition } from "./transition";

export class RetryTransition extends JobTransition {
  delay?: number;
  reason: string | Error | ErrorData;

  constructor(reason: ErrorData | Error | string, delay?: number) {
    super();
    this.delay = delay;
    this.reason = reason;
  }

  apply(job: JobData): JobData {
    logger().error(this.reason);

    const delay = this.delay ?? this.calculateBackoff(job.attempt);
    logger().info(`retrying failed job ${job.class} in ${delay}ms`);

    const reason = toErrorData(this.reason);

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
    return Math.round(Math.min(baseDelay * Math.pow(2, attempt - 1) * jitter, maxDelay));
  }
}
