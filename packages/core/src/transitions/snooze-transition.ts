import { logger } from "../logger";
import { JobData } from "../schema";
import { JobTransition } from "./transition";

/**
 * Transition for snoozing (delaying) a job.
 */
export class SnoozeTransition extends JobTransition {
  /** The delay in milliseconds. */
  delay: number;

  /**
   * Creates a new SnoozeTransition.
   * @param delay The delay in milliseconds.
   */
  constructor(delay: number) {
    super();
    this.delay = delay;
  }

  /**
   * Applies the snooze transition to the job.
   * @param job The job data to update.
   * @returns The updated job data.
   */
  apply(job: JobData): JobData {
    logger("Core").info(`Job ${job.class} snoozed by ${this.delay}ms`);
    job.state = "waiting";
    if (job.attempt > 0) {
      job.attempt -= 1;
    }
    job.available_at = new Date(Date.now() + this.delay);
    return job;
  }
}
