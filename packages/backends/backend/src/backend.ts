import { JobData, JobState, QueueConfig } from "@sidequest/core";

/**
 * Data required to create a new job.
 */
export type NewJobData = Pick<JobData, "queue" | "script" | "class" | "args" | "constructor_args"> &
  Partial<Pick<JobData, "max_attempts" | "available_at" | "timeout" | "unique_digest" | "uniqueness_config">> & {
    /** The job state, always 'waiting' for new jobs. */
    state: "waiting";
    /** The attempt number, always 0 for new jobs. */
    attempt: 0;
  };

/**
 * Data required to update an existing job.
 */
export type UpdateJobData = Pick<JobData, "id"> & Partial<Omit<JobData, "id">>;

/**
 * Data required to create a new queue.
 */
export type NewQueueData = Pick<QueueConfig, "name"> & Partial<Omit<QueueConfig, "queue" | "id">>;

/**
 * Data required to update an existing queue.
 */
export type UpdateQueueData = Pick<QueueConfig, "id"> & Partial<Omit<QueueConfig, "id">>;

/**
 * Represents the count of jobs grouped by their current state.
 *
 * This interface provides a comprehensive overview of job distribution across
 * different execution states, allowing for monitoring and reporting of job
 * queue status and performance metrics.
 *
 * @example
 * ```typescript
 * const jobCounts: JobCounts = {
 *   total: 150,
 *   waiting: 25,
 *   claimed: 10,
 *   running: 15,
 *   completed: 85,
 *   failed: 12,
 *   canceled: 3
 * };
 * ```
 */
export interface JobCounts {
  /** The total number of jobs. */
  total: number;
  /** The number of jobs in the 'waiting' state. */
  waiting: number;
  /** The number of jobs in the 'claimed' state. */
  claimed: number;
  /** The number of jobs in the 'running' state. */
  running: number;
  /** The number of jobs in the 'completed' state. */
  completed: number;
  /** The number of jobs in the 'failed' state. */
  failed: number;
  /** The number of jobs in the 'canceled' state. */
  canceled: number;
}

/**
 * Interface for a backend implementation.
 */
export interface Backend {
  /**
   * Runs the database migrations to bring the schema up to date.
   *
   * Executes all pending migration files in the correct order,
   * applying schema changes to the database. Useful for initializing
   * or upgrading the database to the latest version.
   *
   */
  migrate(): Promise<void>;

  /**
   * Rolls back the most recent database migration.
   *
   * Reverts the last applied migration file, undoing its schema changes.
   * Useful for stepping back in development or undoing a problematic change.
   *
   */
  rollbackMigration(): Promise<void>;

  /**
   * Closes the backend and releases resources.
   */
  close(): Promise<void>;

  /**
   * Creates a new queue.
   * @param queueConfig The new queue.
   * @returns The created queue.
   */
  createNewQueue(queueConfig: NewQueueData): Promise<QueueConfig>;

  /**
   * Gets the queue by its name.
   * @param queue The queue name.
   * @returns The queue, if found.
   */
  getQueue(queue: string): Promise<QueueConfig | undefined>;

  /**
   * Gets the list of queue names from jobs.
   * @returns An array of queue names.
   */
  getQueuesFromJobs(): Promise<string[]>;

  /**
   * Lists all queues, optionally ordered. Defaults to ordering by priority descending.
   * @param orderBy Optional ordering options.
   * @returns An array of queue configurations.
   */
  listQueues(orderBy?: { column?: keyof QueueConfig; order?: "asc" | "desc" }): Promise<QueueConfig[]>;

  /**
   * Updates a queue configuration.
   * @param queueData The updated queue data.
   * @returns The updated queue configuration.
   */
  updateQueue(queueData: UpdateQueueData): Promise<QueueConfig>;

  /**
   * Gets a job by its ID.
   * @param id The job ID.
   * @returns The job data, if found.
   */
  getJob(id: number): Promise<JobData | undefined>;

  /**
   * Creates a new job.
   * @param job The new job data.
   * @returns The created job data.
   */
  createNewJob(job: NewJobData): Promise<JobData>;

  /**
   * Safely claims a pending job from a queue.
   * The database should grant that a job can only be claimed once in a concurrent environment.
   * For example, update-returning the job with the claimed state in a single transaction.
   *
   * @param queue The queue name.
   * @param quantity The number of jobs to claim.
   * @returns An array of claimed job data.
   */
  claimPendingJob(queue: string, quantity?: number): Promise<JobData[]>;

  /**
   * Updates a job.
   * @param job The updated job data.
   * @returns The updated job data.
   */
  updateJob(job: UpdateJobData): Promise<JobData>;

  /**
   * Lists jobs with optional filters.
   * @param params Optional filter parameters. Where string arrays, they are treated as OR conditions.
   * @param params.queue Filter by queue name(s).
   * @param params.jobClass Filter by job class name(s).
   * @param params.state Filter by job state(s).
   * @param params.limit Maximum number of jobs to return.
   * @param params.offset Offset for pagination.
   * @param params.args Filter by job arguments.
   * @param params.timeRange Filter by job time range.
   * @param params.timeRange.from Start attempted_at date for filtering jobs.
   * @param params.timeRange.to End attempted_at date for filtering jobs.
   * @returns An array of job data.
   *
   * @remarks
   *
   * The state, queue, and jobClass parameters can be single values or arrays.
   * If arrays are provided, they are treated as OR conditions.
   * If a single value is provided, it is treated as a LIKE match, so you can append and prepend wildcards
   * to match substrings.
   */
  listJobs(params?: {
    queue?: string | string[];
    jobClass?: string | string[];
    state?: JobState | `${string}%${string}` | JobState[];
    limit?: number;
    offset?: number;
    args?: unknown[];
    timeRange?: {
      from?: Date;
      to?: Date;
    };
  }): Promise<JobData[]>;

  /**
   * Gets job counts based on states.
   *
   * @param timeRange Optional time range for statistics. Filters by `attempted_at`.
   * @returns Job statistics including counts of jobs in various states.
   */
  countJobs(timeRange?: { from?: Date; to?: Date }): Promise<JobCounts>;

  /**
   * Counts jobs over time, grouped by a specified time unit.
   *
   * @param timeRange The time range to filter jobs. e.g., 12m, 12h, 12d.
   * @param unit The time unit for grouping (e.g., 'day', 'hour').
   * @returns An array of objects containing timestamps and job counts.
   */
  countJobsOverTime(timeRange: string): Promise<({ timestamp: Date } & JobCounts)[]>;

  /**
   * Finds jobs that are stale or have timed out.
   * @param maxStaleMs Maximum milliseconds for a job to be considered stale.
   * @param maxClaimedMs Maximum milliseconds for a claimed job to be in the claimed state.
   * @returns An array of stale job data.
   */
  staleJobs(maxStaleMs?: number, maxClaimedMs?: number): Promise<JobData[]>;

  /**
   * Deletes completed, failed, and canceled jobs before a cutoff date.
   * @param cutoffDate The cutoff date.
   */
  deleteFinishedJobs(cutoffDate: Date): Promise<void>;

  /**
   * Truncates all jobs and queues.
   */
  truncate(): Promise<void>;
}
