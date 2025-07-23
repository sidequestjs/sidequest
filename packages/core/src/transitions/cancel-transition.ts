import { JobData } from "../schema";
import { JobTransition } from "./transition";

/**
 * Transition for marking a job as canceled.
 *
 * This transition sets the job state to "canceled" and records the
 * cancellation timestamp. Canceled jobs will not be retried or processed.
 *
 * Running jobs will be aborted, but this transition does not
 * stop jobs that are already claimed or running. It only marks them as canceled.
 * The engine will handle the actual stopping of running jobs.
 *
 * This transition can be applied to jobs in "waiting" or "running" states.
 */
export class CancelTransition extends JobTransition {
  apply(job: JobData): JobData {
    job.state = "canceled";
    job.canceled_at = new Date();
    return job;
  }

  shouldRun(job: JobData): boolean {
    return ["waiting", "running"].includes(job.state);
  }
}
