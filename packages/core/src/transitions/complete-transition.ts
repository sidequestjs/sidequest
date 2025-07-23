import { logger } from "../logger";
import { JobData } from "../schema";
import { JobTransition } from "./transition";

/**
 * Transition for marking a job as completed.
 *
 * This transition sets the job state to "completed", records the completion timestamp,
 * and stores the result of the job. Completed jobs will not be retried or processed again.
 *
 * This transition can only be applied to jobs that are currently running.
 */
export class CompleteTransition extends JobTransition {
  /** The result of the completed job. */
  result?: unknown;

  /**
   * Creates a new CompleteTransition.
   * @param result The result to store in the job.
   */
  constructor(result?: unknown) {
    super();
    this.result = result;
  }

  apply(job: JobData): JobData {
    logger("Core").info(`Job ${job.class} has completed with args: ${JSON.stringify(job.args)}`);
    job.completed_at = new Date();
    job.state = "completed";
    job.result = this.result ?? null;
    return job;
  }

  shouldRun(job: JobData): boolean {
    return job.state === "running";
  }
}
