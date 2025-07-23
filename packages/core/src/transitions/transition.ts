import { JobData } from "../schema";

/**
 * Abstract base class for job state transitions.
 */
export abstract class JobTransition {
  /**
   * Applies the transition to the given job.
   * @param job The job data to update.
   * @returns The updated job data.
   */
  abstract apply(job: JobData): JobData;

  /**
   * Determines if the transition should be applied to the job.
   * This can be used to check conditions like job state or other criteria.
   * @param job The job data to check.
   * @returns True if the transition should be applied, false otherwise.
   */
  abstract shouldRun(job: JobData): boolean;
}
