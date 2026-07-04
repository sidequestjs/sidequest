import type { Backend } from "@sidequest/backend";
import { CancelTransition, type JobData, type JobState, type JobTransition, RerunTransition, SnoozeTransition } from "@sidequest/core";
import { JobTransitioner } from "@sidequest/engine";
import { JobNotFoundError } from "../errors";

/** Filters accepted by {@link JobService.list}, passed straight through to the backend. */
export interface JobListFilters {
  queue?: string | string[];
  jobClass?: string | string[];
  state?: JobState | `${string}%${string}` | JobState[];
  limit?: number;
  offset?: number;
  timeRange?: { from?: Date; to?: Date };
}

/**
 * Read/mutation operations over jobs, framework-neutral (no HTTP).
 *
 * This is the override seam for the Pro: subclass it, override a method (calling `super`
 * to reuse the OSS query), and mount the same route factory with the subclass.
 */
export class JobService {
  constructor(protected readonly backend: Backend) {}

  /** Lists jobs matching the given filters. */
  list(filters: JobListFilters = {}): Promise<JobData[]> {
    return this.backend.listJobs(filters);
  }

  /** Gets a single job by id, or `undefined` if it does not exist. */
  get(id: number): Promise<JobData | undefined> {
    return this.backend.getJob(id);
  }

  /** Distinct queue names that appear on jobs (used by the list filter dropdown). */
  queueNames(): Promise<string[]> {
    return this.backend.getQueuesFromJobs();
  }

  /** Cancels a job. Throws {@link JobNotFoundError} if it does not exist. */
  cancel(id: number): Promise<JobData> {
    return this.applyTransition(id, new CancelTransition());
  }

  /** Re-runs a job from scratch. Throws {@link JobNotFoundError} if it does not exist. */
  rerun(id: number): Promise<JobData> {
    return this.applyTransition(id, new RerunTransition());
  }

  /**
   * Makes a job runnable now. A canceled job is reset via a rerun; anything else is snoozed
   * to zero (available immediately). Mirrors the old dashboard "run" action.
   */
  async run(id: number): Promise<JobData> {
    const job = await this.require(id);
    const transition = job.state === "canceled" ? new RerunTransition() : new SnoozeTransition(0);
    return JobTransitioner.apply(this.backend, job, transition);
  }

  /** Loads a job and applies a transition, or throws {@link JobNotFoundError}. */
  protected async applyTransition(id: number, transition: JobTransition): Promise<JobData> {
    const job = await this.require(id);
    return JobTransitioner.apply(this.backend, job, transition);
  }

  /** Loads a job or throws {@link JobNotFoundError}. */
  protected async require(id: number): Promise<JobData> {
    const job = await this.backend.getJob(id);
    if (!job) throw new JobNotFoundError(id);
    return job;
  }
}
