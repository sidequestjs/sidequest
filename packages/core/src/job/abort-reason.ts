/**
 * Reason set on a job's `abortSignal` when the engine aborts a running job.
 *
 * Inspect `job.abortSignal.reason` inside `run` to tell why the job is being aborted, e.g. to log
 * or clean up differently for a timeout vs an explicit cancellation.
 */
export type AbortReason = JobTimeout | JobCanceled;

/**
 * Set as the `abortSignal.reason` when a job is aborted because it exceeded its `timeout`.
 */
export class JobTimeout extends Error {
  constructor(timeoutMs: number) {
    super(`Job timed out after ${timeoutMs}ms`);
    this.name = "JobTimeout";
  }
}

/**
 * Set as the `abortSignal.reason` when a running job is aborted because it was canceled.
 */
export class JobCanceled extends Error {
  constructor() {
    super("Job was canceled");
    this.name = "JobCanceled";
  }
}
