import { Backend } from "@sidequest/backend";
import { JobData, JobTransitionFactory, logger, QueueConfig, RunningTransition } from "@sidequest/core";
import EventEmitter from "events";
import { JobTransitioner } from "../job/job-transitioner";
import { RunnerPool } from "../shared-runner";

/**
 * Manages job execution and worker concurrency for Sidequest.
 */
export class ExecutorManager {
  private activeByQueue: Record<string, Set<number>>;
  private activeJobs: Set<number>;
  private runnerPool: RunnerPool;

  /**
   * Creates a new ExecutorManager.
   * @param backend The backend instance.
   * @param maxConcurrentJobs The maximum number of concurrent jobs across all queues.
   * @param minThreads Minimum number of worker threads to use.
   * @param maxThreads Maximum number of worker threads to use.
   */
  constructor(
    private backend: Backend,
    private maxConcurrentJobs: number,
    minThreads: number,
    maxThreads: number,
  ) {
    this.activeByQueue = {};
    this.activeJobs = new Set();
    this.runnerPool = new RunnerPool(minThreads, maxThreads);
  }

  /**
   * Gets the number of available slots for a given queue.
   * @param queueConfig The queue configuration.
   * @returns The number of available slots.
   */
  availableSlotsByQueue(queueConfig: QueueConfig) {
    if (!this.activeByQueue[queueConfig.name]) {
      this.activeByQueue[queueConfig.name] = new Set();
    }
    const activeJobs = this.activeByQueue[queueConfig.name];
    const limit = queueConfig.concurrency ?? 10;

    const availableSlots = limit - activeJobs.size;
    if (availableSlots < 0) {
      return 0;
    }
    return availableSlots;
  }

  /**
   * Gets the number of available slots globally.
   * @returns The number of available slots.
   */
  availableSlotsGlobal() {
    const limit = this.maxConcurrentJobs;
    const availableSlots = limit - this.activeJobs.size;
    if (availableSlots < 0) {
      return 0;
    }
    return availableSlots;
  }

  /**
   * Gets the total number of active workers.
   * @returns The number of active jobs.
   */
  totalActiveWorkers() {
    return this.activeJobs.size;
  }

  /**
   * Executes a job in the given queue.
   * @param queueConfig The queue configuration.
   * @param job The job data to execute.
   */
  async execute(queueConfig: QueueConfig, job: JobData): Promise<void> {
    logger("Executor Manager").debug(`Submitting job ${job.id} for execution in queue ${queueConfig.name}`);
    if (!this.activeByQueue[queueConfig.name]) {
      this.activeByQueue[queueConfig.name] = new Set();
    }

    // TODO: add availabilith check
    this.activeByQueue[queueConfig.name].add(job.id);
    this.activeJobs.add(job.id);

    job = await JobTransitioner.apply(job, new RunningTransition());

    const signal = new EventEmitter();

    let isRunning = true;

    const jobChecker = async () => {
      while (isRunning) {
        const watchedJob = await this.backend.getJob(job.id);
        if (watchedJob?.state === "canceled") {
          logger("Executor Manager").debug(`Emitting abort signal for job ${job.id}`);
          signal.emit("abort");
          isRunning = false;
          return;
        }
        await new Promise((r) => setTimeout(r, 1000));
      }
    };
    void jobChecker();

    try {
      logger("Executor Manager").debug(`Running job ${job.id} in queue ${queueConfig.name}`);
      const result = await this.runnerPool.run(job, signal);
      logger("Executor Manager").debug(`Job ${job.id} completed with result: ${JSON.stringify(result)}`);
      isRunning = false;
      const transition = JobTransitionFactory.create(result);

      await JobTransitioner.apply(job, transition);

      this.activeByQueue[queueConfig.name].delete(job.id);
      this.activeJobs.delete(job.id);
    } catch (error: unknown) {
      isRunning = false;
      const err = error as Error;
      if (err.message === "The task has been aborted") {
        logger("Executor Manager").debug(`Job ${job.id} was canceled`);
      } else {
        logger("Executor Manager").error(`Error executing job ${job.id}: ${err.message}`);
        throw error;
      }
    }
  }
}
