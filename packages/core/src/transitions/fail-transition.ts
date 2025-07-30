import { logger } from "../logger";
import { JobData } from "../schema";
import { ErrorData } from "../schema/error-data";
import { toErrorData } from "../tools/parse-error-data";
import { JobTransition } from "./transition";

/**
 * Transition for marking a job as failed.
 *
 * This transition sets the job state to "failed" and records the
 * failure reason and timestamp. It also stores the error data in the job's errors array.
 * Failed jobs will not be retried or processed again.
 *
 * This transition can only be applied to jobs that are currently running.
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

  apply(job: JobData): JobData {
    logger("Core").error(this.reason);
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

  shouldRun(job: JobData): boolean {
    return job.state === "running";
  }
}
