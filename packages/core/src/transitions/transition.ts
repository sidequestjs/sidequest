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
}
