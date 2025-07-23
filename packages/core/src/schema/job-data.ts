import { UniquenessConfig } from "../uniquiness";
import { ErrorData } from "./error-data";

/**
 * Represents the possible states of a job in the system.
 *
 * - `"waiting"`: The job is ready or scheduled for execution.
 * - `"claimed"`: The job has been reserved by a worker.
 * - `"running"`: The job is currently being executed.
 * - `"failed"`: The job has permanently failed (maximum attempts exceeded).
 * - `"completed"`: The job has finished successfully.
 * - `"canceled"`: The job was manually canceled.
 */
export type JobState =
  | "waiting" // Ready or scheduled for execution
  | "claimed" // Reserved by a worker
  | "running" // Currently executing
  | "failed" // Permanently failed (max attempts exceeded)
  | "completed" // Finished successfully
  | "canceled"; // Manually canceled

// #region JobData
/**
 * Represents the data structure for a job in the queue system.
 *
 * Contains metadata, execution details, state tracking, error reporting,
 * uniqueness configuration, and timestamps for lifecycle events.
 *
 * @remarks
 * This interface is used to define the schema for jobs managed by the queue,
 * including information about execution attempts, results, errors, and
 * worker claims.
 */
export interface JobData {
  /**
   * Unique identifier for the job.
   */
  id: number;

  /**
   * Name of the queue this job belongs to.
   */
  queue: string;

  /**
   * Current state of the job.
   */
  state: JobState;

  /**
   * The script or module associated with the job.
   */
  script: string;

  /**
   * The class name responsible for executing the job.
   */
  class: string;

  /**
   * Arguments to be passed to the job's execution method.
   */
  args: unknown[];

  /**
   * Arguments to be passed to the job's constructor.
   */
  constructor_args: unknown[];

  /**
   * Number of times this job has been attempted.
   */
  attempt: number;

  /**
   * Maximum number of attempts allowed for this job.
   */
  max_attempts: number;

  /**
   * Timestamp when the job was inserted into the queue.
   */
  inserted_at: Date;

  /**
   * Timestamp when the job becomes available for processing.
   */
  available_at: Date;

  /**
   * Maximum allowed execution time for the job, in milliseconds. Null if no timeout is set.
   */
  timeout: number | null;

  /**
   * Result of the job execution, if available.
   */
  result: Omit<unknown, "undefined"> | null;

  /**
   * List of errors encountered during job execution, if any.
   */
  errors: ErrorData[] | null;

  /**
   * Timestamp when the job was last attempted, or null if never attempted.
   */
  attempted_at: Date | null;

  /**
   * Timestamp when the job was completed, or null if not completed.
   */
  completed_at: Date | null;

  /**
   * Timestamp when the job failed, or null if not failed.
   */
  failed_at: Date | null;

  /**
   * Timestamp when the job was canceled, or null if not canceled.
   */
  canceled_at: Date | null;

  /**
   * Timestamp when the job was claimed by a worker, or null if not claimed.
   */
  claimed_at: Date | null;

  /**
   * Identifier of the worker that claimed the job, or null if not claimed.
   */
  claimed_by: string | null;

  /**
   * Unique digest string used for job uniqueness, or null if not set.
   */
  unique_digest: string | null;

  /**
   * Configuration object for job uniqueness, or null if not set.
   */
  uniqueness_config: UniquenessConfig | null;
}
// #endregion JobData
