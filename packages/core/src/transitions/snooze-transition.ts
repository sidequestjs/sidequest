import { logger } from "../logger";
import { JobData } from "../schema";
import { JobTransition } from "./transition";

/**
 * Transition for snoozing (delaying) a job.
 *
 * This transition sets the job state to "waiting" and updates the
 * available_at timestamp to the current time plus the specified delay.
 * If the job is currently running, it will decrement the attempt count.
 * This allows the job to be retried after the delay.
 *
 * Only jobs in "waiting" or "running" state can be snoozed.
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

  apply(job: JobData): JobData {
    logger("Core").info(`Job #${job.id} - ${job.class} snoozed by ${this.delay}ms`);

    // Attempts are only decremented if the job is running and has already been attempted
    // This means that the job will not consider the current run as an attempt
    if (job.state === "running" && job.attempt > 0) {
      job.attempt -= 1;
    }

    job.state = "waiting";
    job.available_at = new Date(Date.now() + this.delay);
    return job;
  }

  shouldRun(job: JobData): boolean {
    return ["waiting", "running"].includes(job.state);
  }
}
