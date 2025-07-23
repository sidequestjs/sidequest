import { logger } from "../logger";
import { JobData } from "../schema";
import { ErrorData } from "../schema/error-data";
import { toErrorData } from "../tools/parse-error-data";
import { JobTransition } from "./transition";

/**
 * Transition for retrying a failed job.
 */
export class RetryTransition extends JobTransition {
  /** Optional delay in milliseconds before retrying. */
  delay?: number;
  /** The reason for retrying. */
  reason: string | Error | ErrorData;

  /**
   * Creates a new RetryTransition.
   * @param reason The reason for retrying.
   * @param delay Optional delay in milliseconds before retrying.
   */
  constructor(reason: ErrorData | Error | string, delay?: number) {
    super();
    this.delay = delay;
    this.reason = reason;
  }

  /**
   * Applies the retry transition to the job.
   * @param job The job data to update.
   * @returns The updated job data.
   */
  apply(job: JobData): JobData {
    logger().error(this.reason);
    const reason = toErrorData(this.reason);

    const delay = this.delay ?? this.calculateBackoff(job.attempt);
    logger("Core").info(`Retrying failed job ${job.class} in ${delay}ms`);

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
      job.failed_at = new Date();
    } else {
      job.state = "waiting";
      job.available_at = new Date(Date.now() + delay);
    }
    return job;
  }

  /**
   * Calculates the backoff delay for a retry attempt using exponential backoff with jitter.
   *
   * @param attempt - The current retry attempt number (1-based).
   * @param baseDelay - The base delay in milliseconds for the first attempt. Defaults to 1000 ms.
   * @param maxDelay - The maximum delay in milliseconds. Defaults to 3,600,000 ms (1 hour).
   * @returns The calculated backoff delay in milliseconds, randomized with jitter and capped at maxDelay.
   */
  private calculateBackoff(attempt: number, baseDelay = 1000, maxDelay = 3600000): number {
    const jitter = Math.random() + 0.5;
    return Math.round(Math.min(baseDelay * Math.pow(2, attempt - 1) * jitter, maxDelay));
  }
}
