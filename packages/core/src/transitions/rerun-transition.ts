import { logger } from "../logger";
import { JobData } from "../schema";
import { JobTransition } from "./transition";

/**
 * Transition for re-running a job.
 * This will reset the job to waiting state and ensure it can be executed again.
 * If the job has reached its maximum attempts, it will increase the max_attempts by 1.
 *
 * This transition can only be applied to jobs that are in completed, canceled, or failed states.
 */
export class RerunTransition extends JobTransition {
  apply(job: JobData): JobData {
    logger("Core").info(`Re-running job #${job.id} - ${job.class}`);

    // Reset job state to waiting
    job.state = "waiting";
    job.available_at = new Date();

    // If the job has reached max attempts, increase max_attempts by 1
    if (job.attempt >= job.max_attempts) {
      job.max_attempts = job.attempt + 1;
      logger("Core").debug(`Increased max_attempts to ${job.max_attempts} for job ${job.id}`);
    }

    return job;
  }

  shouldRun(job: JobData): boolean {
    return ["completed", "canceled", "failed"].includes(job.state);
  }
}
