import { logger } from "../logger";
import { JobData } from "../schema";
import { JobTransition } from "./transition";

/**
 * Transition for marking a job as running.
 */
export class RunningTransition extends JobTransition {
  /**
   * Applies the running transition to the job.
   * @param job The job data to update.
   * @returns The updated job data.
   */
  apply(job: JobData): JobData {
    logger("Core").info(`Running job ${job.class} with args: ${JSON.stringify(job.args)}`);
    job.state = "running";
    job.attempted_at = new Date();
    job.attempt = job.attempt + 1;
    return job;
  }
}
