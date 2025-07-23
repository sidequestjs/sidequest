import { JobData } from "../schema";

/**
 * Error thrown when a job with the same parameters is detected as duplicated.
 *
 * @extends Error
 * @param job - The job data that caused the duplication error.
 * @remarks
 * This error includes information about the job's class, constructor arguments, and additional arguments.
 */
export class DuplicatedJobError extends Error {
  constructor(job: JobData) {
    super(
      `Job ${job.class} is duplicated, constructor args: ${JSON.stringify(job.constructor_args)} args: ${JSON.stringify(job.args)}`,
    );
  }
}
