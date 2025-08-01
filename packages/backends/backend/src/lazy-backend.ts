import { JobData, JobState, QueueConfig } from "@sidequest/core";
import { Backend, JobCounts, NewJobData, NewQueueData, UpdateJobData, UpdateQueueData } from "./backend";
import { BackendConfig } from "./config";
import { createBackendFromDriver } from "./factory";

/**
 * A backend wrapper that lazily initializes the underlying backend implementation.
 *
 * `LazyBackend` defers the creation of the actual backend until it is needed,
 * ensuring resources are only allocated when required. All backend operations
 * are proxied to the underlying backend instance, which is created on first use.
 *
 * @remarks
 * This class is useful for scenarios where backend initialization is expensive
 * or should be deferred until an operation is actually performed.
 *
 * @example
 * ```typescript
 * const lazyBackend = new LazyBackend(config);
 * await lazyBackend.createNewQueue(queueConfig);
 * ```
 *
 * @param config - The configuration used to create the backend.
 *
 * @implements Backend
 */
export class LazyBackend implements Backend {
  /**
   * A promise that resolves to a {@link Backend} instance.
   * Used to ensure that the backend is initialized asynchronously and only once.
   * May be undefined if the backend has not been initialized yet.
   */
  private backendPromise?: Promise<Backend>;

  /**
   * Optional instance of the {@link Backend} class.
   * Used to store the backend implementation, which may be undefined if not yet initialized.
   */
  private backend?: Backend;

  /**
   * Creates an instance of the class with the provided backend configuration.
   * @param config - The configuration object for the backend.
   */
  constructor(private config: BackendConfig) {}

  /**
   * Initializes the backend instance if it has not already been created.
   *
   * If the backend does not exist, this method creates a new backend instance
   * using the provided configuration. It ensures that the backend is only
   * initialized once, even if called multiple times concurrently, by caching
   * the initialization promise.
   *
   * @returns {Promise<void>} A promise that resolves when the backend has been initialized.
   */
  async init(): Promise<void> {
    if (!this.backend) {
      this.backendPromise ??= createBackendFromDriver(this.config);
      this.backend = await this.backendPromise;
    }
  }

  async migrate(): Promise<void> {
    await this.init();
    return this.backend!.migrate();
  }

  async rollbackMigration(): Promise<void> {
    await this.init();
    return this.backend!.rollbackMigration();
  }

  async close(): Promise<void> {
    // Here we don't call init because if calling close before inniting, we want to avoid creating the backend.
    return this.backend?.close();
  }

  async createNewQueue(queueConfig: NewQueueData): Promise<QueueConfig> {
    await this.init();
    return this.backend!.createNewQueue(queueConfig);
  }

  async getQueue(queue: string): Promise<QueueConfig | undefined> {
    await this.init();
    return this.backend!.getQueue(queue);
  }

  async getQueuesFromJobs(): Promise<string[]> {
    await this.init();
    return this.backend!.getQueuesFromJobs();
  }

  async listQueues(orderBy?: { column?: keyof QueueConfig; order?: "asc" | "desc" }): Promise<QueueConfig[]> {
    await this.init();
    return this.backend!.listQueues(orderBy);
  }

  async updateQueue(queueData: UpdateQueueData): Promise<QueueConfig> {
    await this.init();
    return this.backend!.updateQueue(queueData);
  }

  async getJob(id: number): Promise<JobData | undefined> {
    await this.init();
    return this.backend!.getJob(id);
  }

  async createNewJob(job: NewJobData): Promise<JobData> {
    await this.init();
    return this.backend!.createNewJob(job);
  }

  async claimPendingJob(queue: string, quantity?: number): Promise<JobData[]> {
    await this.init();
    return this.backend!.claimPendingJob(queue, quantity);
  }

  async updateJob(job: UpdateJobData): Promise<JobData> {
    await this.init();
    return this.backend!.updateJob(job);
  }

  async listJobs(params?: {
    queue?: string | string[];
    jobClass?: string | string[];
    state?: JobState | JobState[];
    limit?: number;
    offset?: number;
    args?: unknown[];
    timeRange?: { from?: Date; to?: Date };
  }): Promise<JobData[]> {
    await this.init();
    return this.backend!.listJobs(params);
  }

  async countJobs(timeRange?: { from?: Date; to?: Date }): Promise<JobCounts> {
    await this.init();
    return this.backend!.countJobs(timeRange);
  }

  async countJobsOverTime(timeRange: string): Promise<({ timestamp: Date } & JobCounts)[]> {
    await this.init();
    return this.backend!.countJobsOverTime(timeRange);
  }

  async staleJobs(maxStaleMs?: number, maxClaimedMs?: number): Promise<JobData[]> {
    await this.init();
    return this.backend!.staleJobs(maxStaleMs, maxClaimedMs);
  }

  async deleteFinishedJobs(cutoffDate: Date): Promise<void> {
    await this.init();
    return this.backend!.deleteFinishedJobs(cutoffDate);
  }

  async truncate(): Promise<void> {
    await this.init();
    return this.backend!.truncate();
  }
}
