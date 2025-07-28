import { Backend, JobCounts, NewJobData, UpdateJobData } from "@sidequest/backend";
import { CancelTransition, JobData, JobState, RerunTransition, SnoozeTransition } from "@sidequest/core";
import { JobTransitioner } from "@sidequest/engine";

/**
 * Entry point for managing jobs in Sidequest.
 *
 * Provides high-level methods for job management operations including
 * job building, state management, querying, and administrative tasks.
 */
export class JobOperations {
  /**
   * Backend instance from the Sidequest engine.
   * @returns The backend instance.
   * @throws Error if the engine is not configured.
   */
  private backend?: Backend;

  /**
   * Singleton instance of JobOperations.
   * This allows for easy access to job management methods without needing to instantiate the class.
   */
  static readonly instance = new JobOperations();

  /**
   * Private constructor to enforce singleton pattern.
   * Prevents instantiation from outside the class.
   */
  private constructor() {
    // noop
  }

  /**
   * Sets the backend instance for the JobOperations.
   * This is typically called by the Sidequest engine during configuration.
   *
   * @param backend - The backend instance to set
   */
  public setBackend(backend: Backend | undefined) {
    this.backend = backend;
  }

  /**
   * Gets the backend instance from the engine.
   * @returns The backend instance.
   * @throws Error if the engine is not configured.
   */
  private getBackend(): Backend {
    if (!this.backend) {
      throw new Error("Engine not configured. Call Sidequest.configure() or Sidequest.start() first.");
    }
    return this.backend;
  }

  /**
   * Gets a job by its ID.
   *
   * @param id - The job ID
   * @returns Promise resolving to the job data if found, undefined otherwise
   */
  async get(id: number): Promise<JobData | undefined> {
    const backend = this.getBackend();
    return await backend.getJob(id);
  }

  /**
   * Lists jobs with optional filters and pagination.
   *
   * @param params - Optional filter parameters
   * @param params.queue - Filter by queue name(s)
   * @param params.jobClass - Filter by job class name(s)
   * @param params.state - Filter by job state(s)
   * @param params.limit - Maximum number of jobs to return
   * @param params.offset - Offset for pagination
   * @param params.args - Filter by job arguments
   * @param params.timeRange - Filter by job time range
   * @returns Promise resolving to an array of job data
   */
  async list(params?: {
    queue?: string | string[];
    jobClass?: string | string[];
    state?: JobState | JobState[];
    limit?: number;
    offset?: number;
    args?: unknown[];
    timeRange?: {
      from?: Date;
      to?: Date;
    };
  }): Promise<JobData[]> {
    const backend = this.getBackend();
    return await backend.listJobs(params);
  }

  /**
   * Counts jobs by their states, optionally within a time range.
   *
   * @param timeRange - Optional time range for filtering jobs by attempted_at
   * @returns Promise resolving to job counts grouped by state
   */
  async count(timeRange?: { from?: Date; to?: Date }): Promise<JobCounts> {
    const backend = this.getBackend();
    return await backend.countJobs(timeRange);
  }

  /**
   * Counts jobs over time, grouped by a specified time unit.
   *
   * @param timeRange - The time range to filter jobs (e.g., '12m', '12h', '12d')
   * @returns Promise resolving to an array of objects containing timestamps and job counts
   */
  async countOverTime(timeRange: string): Promise<({ timestamp: Date } & JobCounts)[]> {
    const backend = this.getBackend();
    return await backend.countJobsOverTime(timeRange);
  }

  /**
   * Finds jobs that are stale or have timed out.
   *
   * @param maxStaleMs - Maximum milliseconds for a job to be considered stale. Defaults to 10m.
   * @param maxClaimedMs - Maximum milliseconds for a claimed job to be in the claimed state. Defaults to 1m.
   * @returns Promise resolving to an array of stale job data
   */
  async findStale(maxStaleMs?: number, maxClaimedMs?: number): Promise<JobData[]> {
    const backend = this.getBackend();
    return await backend.staleJobs(maxStaleMs, maxClaimedMs);
  }

  /**
   * Deletes finished jobs (completed, failed, canceled) before a cutoff date.
   *
   * @param cutoffDate - The cutoff date - jobs finished before this date will be deleted
   * @returns Promise that resolves when deletion is complete
   */
  async deleteFinished(cutoffDate: Date): Promise<void> {
    const backend = this.getBackend();
    return await backend.deleteFinishedJobs(cutoffDate);
  }

  /**
   * Cancels a job by transitioning it to the canceled state.
   *
   * Running jobs will be aborted, but this method does not
   * stop jobs that are already claimed or running. It only marks them as canceled.
   * The engine will handle the actual stopping of running jobs.
   *
   * This transition can only be applied to jobs in "waiting" or "running" states.
   *
   * @param jobId - The ID of the job to cancel
   * @returns Promise resolving to the updated job data or the same job data if transition is not applicable
   * @throws Error if the job is not found
   */
  async cancel(jobId: number): Promise<JobData> {
    const backend = this.getBackend();
    const job = await backend.getJob(jobId);

    if (!job) {
      throw new Error(`Job with ID ${jobId} not found`);
    }

    return await JobTransitioner.apply(backend, job, new CancelTransition());
  }

  /**
   * Runs a job immediately by setting its available_at to the current time.
   * This makes the job available for execution on the next polling cycle.
   *
   * If `force` is `false`, it will simply update the available_at time for waiting jobs.
   * It is effectively a snooze with 0 delay.
   * This can only be applied to "waiting" and "running" jobs.
   *
   * If `force` is `true`, it will use RerunTransition to completely reset and re-run the job,
   * similar to the dashboard's re-run functionality.
   * This can only be applied to jobs that are in "completed", "canceled", or "failed" states.
   *
   * @param jobId - The ID of the job to run
   * @param force - Whether to force re-run the job regardless of state and attempts
   * @returns Promise resolving to the updated job data or the same job data if transition is not applicable
   * @throws Error if the job is not found
   */
  async run(jobId: number, force = false): Promise<JobData> {
    const backend = this.getBackend();
    const job = await backend.getJob(jobId);

    if (!job) {
      throw new Error(`Job with ID ${jobId} not found`);
    }

    if (force) {
      // Use RerunTransition to force a new run, regardless of current state and attempts
      return await JobTransitioner.apply(backend, job, new RerunTransition());
    } else {
      // Simple run - just update available_at to make it available immediately
      return await JobTransitioner.apply(backend, job, new SnoozeTransition(0));
    }
  }

  /**
   * Snoozes a job by delaying its execution for the specified time.
   *
   * This method can only be applied to jobs that are in "waiting" or "running" states.
   *
   * Running jobs won't be stopped, they will run regardless. However, if they fail,
   * it will prevent new attempts to run the job until the snooze delay has passed.
   *
   * @param jobId - The ID of the job to snooze
   * @param delayMs - The delay in milliseconds
   * @returns Promise resolving to the updated job data or the same job data if transition is not applicable
   * @throws Error if the job is not found
   */
  async snooze(jobId: number, delayMs: number): Promise<JobData> {
    if (delayMs < 0) {
      throw new Error("Delay must be a non-negative number");
    }

    const backend = this.getBackend();
    const job = await backend.getJob(jobId);

    if (!job) {
      throw new Error(`Job with ID ${jobId} not found`);
    }

    return await JobTransitioner.apply(backend, job, new SnoozeTransition(delayMs));
  }

  /**
   * Creates a new job directly (bypasses the JobBuilder pattern).
   * This is useful for programmatically creating jobs with specific configurations.
   *
   * @param jobData - The job data to create
   * @returns Promise resolving to the created job data
   */
  async create(jobData: NewJobData): Promise<JobData> {
    const backend = this.getBackend();
    return await backend.createNewJob(jobData);
  }

  /**
   * Updates an existing job with new data. ID is required in the jobData to identify the job.
   *
   * **WARNING**: This method does not perform any validation on the job data and does not ensure Sidequest's integrity.
   * This means you must ensure the job data is valid, complete, and with integrity.
   * Changing a job's state directly is not recommended and should be done through transitions
   * or other methods in this class.
   *
   * Use this with CAUTION.
   *
   * @param jobData - The job update data (must include id)
   * @returns Promise resolving to the updated job data
   * @throws Error if the job is not found
   */
  async update(jobData: UpdateJobData): Promise<JobData> {
    const backend = this.getBackend();

    // Verify job exists
    const existingJob = await backend.getJob(jobData.id);
    if (!existingJob) {
      throw new Error(`Job with ID ${jobData.id} not found`);
    }

    return await backend.updateJob(jobData);
  }
}
