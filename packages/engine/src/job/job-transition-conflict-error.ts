/**
 * Raised when a job changes after a transition reads it but before it can
 * atomically persist its result.
 */
export class JobTransitionConflictError extends Error {
  /**
   * Creates a job transition conflict error.
   * @param jobId The job whose execution snapshot changed.
   * @param transitionName The transition that lost the race.
   */
  constructor(jobId: number, transitionName: string) {
    super(`Cannot apply ${transitionName} to job ${jobId}: the job execution changed`);
    this.name = "JobTransitionConflictError";
  }
}
