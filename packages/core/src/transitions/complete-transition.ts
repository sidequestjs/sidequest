import { logger } from "../logger";
import { JobData } from "../schema";
import { JobTransition } from "./transition";

/**
 * Transition for marking a job as completed.
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

  /**
   * Applies the completion transition to the job.
   * @param job The job data to update.
   * @returns The updated job data.
   */
  apply(job: JobData): JobData {
    logger("Core").info(`Job ${job.class} has completed with args: ${JSON.stringify(job.args)}`);
    job.completed_at = new Date();
    job.state = "completed";
    job.result = this.result ?? null;
    return job;
  }
}
