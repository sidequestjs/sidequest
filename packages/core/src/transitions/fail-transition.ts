import { logger } from "../logger";
import { JobData } from "../schema";
import { ErrorData } from "../schema/error-data";
import { toErrorData } from "../tools/parse-error-data";
import { JobTransition } from "./transition";

/**
 * Transition for marking a job as failed.
 */
export class FailTransition extends JobTransition {
  /** The reason for failure. */
  reason: ErrorData | Error | string;

  /**
   * Creates a new FailTransition.
   * @param reason The reason for the job failure.
   */
  constructor(reason: ErrorData | Error | string) {
    super();
    this.reason = reason;
  }

  /**
   * Applies the failure transition to the job.
   * @param job The job data to update.
   * @returns The updated job data.
   */
  apply(job: JobData): JobData {
    logger().error(this.reason);
    const error = toErrorData(this.reason);
    job.errors ??= [];
    const errData = {
      ...error,
      attempt: job.attempt,
      attempted_at: job.attempted_at,
      attempt_by: job.claimed_by,
    };
    job.errors.push(errData);
    job.state = "failed";
    job.failed_at = new Date();
    return job;
  }
}
