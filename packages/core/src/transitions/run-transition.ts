import { logger } from "../logger";
import { JobData } from "../schema";
import { JobTransition } from "./transition";

/**
 * Transition for marking a job as running.
 *
 * This transition sets the job state to "running", updates the attempted_at timestamp,
 * and increments the attempt count.
 * It is typically used when a job is claimed and starts execution.
 *
 * This transition should only be applied to jobs that are in the "claimed" state.
 * If the job is not in the "claimed" state, this transition will not run.
 */
export class RunTransition extends JobTransition {
  apply(job: JobData): JobData {
    logger("Core").info(`Running job #${job.id} - ${job.class}`);
    job.state = "running";
    job.attempted_at = new Date();
    job.attempt = job.attempt + 1;
    return job;
  }

  shouldRun(job: JobData): boolean {
    return job.state === "claimed";
  }
}
