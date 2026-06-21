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
  /** The timeout, in milliseconds, that was exceeded. */
  readonly timeoutMs: number;

  constructor(timeoutMs: number) {
    super(`Job timed out after ${timeoutMs}ms`);
    this.name = "JobTimeout";
    this.timeoutMs = timeoutMs;
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

/**
 * Structured-clone-safe wire form of an {@link AbortReason}, used to convey the reason to a job
 * running in a worker thread (a live {@link AbortSignal} cannot cross the thread boundary).
 */
export type AbortReasonMessage = { kind: "timeout"; timeoutMs: number } | { kind: "canceled" };

/**
 * Encodes an abort reason into its wire form. Anything that is not a {@link JobTimeout} is treated
 * as a cancellation.
 * @param reason The abort reason (typically `signal.reason`).
 */
export function serializeAbortReason(reason: unknown): AbortReasonMessage {
  return reason instanceof JobTimeout ? { kind: "timeout", timeoutMs: reason.timeoutMs } : { kind: "canceled" };
}

/**
 * Rebuilds the proper {@link AbortReason} instance from its wire form.
 * @param message The wire-form message.
 */
export function deserializeAbortReason(message: AbortReasonMessage): AbortReason {
  return message.kind === "timeout" ? new JobTimeout(message.timeoutMs) : new JobCanceled();
}
