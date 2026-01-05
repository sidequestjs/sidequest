import { Backend } from "@sidequest/backend";
import { JobData, JobTransitionFactory, logger, QueueConfig, RetryTransition, RunTransition } from "@sidequest/core";
import EventEmitter from "events";
import { inspect } from "util";
import { NonNullableEngineConfig } from "../engine";
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
   * @param nonNullConfig The non-nullable engine configuration.
   */
  constructor(
    private backend: Backend,
    private nonNullConfig: NonNullableEngineConfig,
  ) {
    this.activeByQueue = {};
    this.activeJobs = new Set();
    this.runnerPool = new RunnerPool(this.nonNullConfig);
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
    const limit = this.nonNullConfig.maxConcurrentJobs;
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
   * Prepares a job for execution by marking it as active and adding it to a queue slot.
   * @param queueConfig The queue configuration.
   * @param job The job data.
   */
  queueJob(queueConfig: QueueConfig, job: JobData) {
    if (!this.activeByQueue[queueConfig.name]) {
      this.activeByQueue[queueConfig.name] = new Set();
    }
    this.activeByQueue[queueConfig.name].add(job.id);
    this.activeJobs.add(job.id);
  }

  /**
   * Executes a job in the given queue.
   * @param queueConfig The queue configuration.
   * @param job The job data to execute.
   */
  async execute(queueConfig: QueueConfig, job: JobData): Promise<void> {
    let isRunning = false;
    try {
      logger("Executor Manager").debug(`Submitting job ${job.id} for execution in queue ${queueConfig.name}`);
      // We call prepareJob here again to make sure the jobs are in the queues.
      // This might not be necessary, but for the sake of consistency we do it.
      this.queueJob(queueConfig, job);

      job = await JobTransitioner.apply(this.backend, job, new RunTransition());

      isRunning = true;
      const signal = new EventEmitter();
      const cancellationCheck = async () => {
        while (isRunning) {
          const watchedJob = await this.backend.getJob(job.id);
          if (watchedJob!.state === "canceled") {
            logger("Executor Manager").debug(`Emitting abort signal for job ${job.id}`);
            signal.emit("abort");
            isRunning = false;
            return;
          }
          await new Promise((r) => setTimeout(r, 1000));
        }
      };
      void cancellationCheck();

      logger("Executor Manager").debug(`Running job ${job.id} in queue ${queueConfig.name}`);

      const runPromise = this.runnerPool.run(job, signal);

      if (job.timeout) {
        void new Promise(() => {
          setTimeout(() => {
            logger("Executor Manager").debug(`Job ${job.id} timed out after ${job.timeout}ms, aborting.`);
            signal.emit("abort");
            void JobTransitioner.apply(this.backend, job, new RetryTransition(`Job timed out after ${job.timeout}ms`));
          }, job.timeout!);
        });
      }

      const result = await runPromise;

      isRunning = false;
      logger("Executor Manager").debug(`Job ${job.id} completed with result: ${inspect(result)}`);
      const transition = JobTransitionFactory.create(result);
      await JobTransitioner.apply(this.backend, job, transition);
    } catch (error: unknown) {
      isRunning = false;
      const err = error as Error;
      if (err.message === "The task has been aborted") {
        logger("Executor Manager").debug(`Job ${job.id} was aborted`);
      } else {
        logger("Executor Manager").error(`Unhandled error while executing job ${job.id}: ${err.message}`);
        await JobTransitioner.apply(this.backend, job, new RetryTransition(err));
      }
    } finally {
      isRunning = false;
      this.activeByQueue[queueConfig.name].delete(job.id);
      this.activeJobs.delete(job.id);
    }
  }

  /**
   * Destroys the runner pool and releases resources.
   */
  async destroy(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const checkJobs = () => {
        if (this.totalActiveWorkers() === 0) {
          logger("ExecutorManager").info("All active jobs finished. Destroying runner pool.");
          try {
            this.runnerPool.destroy();
            logger("ExecutorManager").debug("Runner pool destroyed. Returning.");
            resolve();
          } catch (error) {
            logger("ExecutorManager").error("Error while destroying runner pool:", error);
            reject(error as Error);
          }
        } else {
          logger("ExecutorManager").info(`Waiting for ${this.totalActiveWorkers()} active jobs to finish...`);
          setTimeout(checkJobs, 1000);
        }
      };

      void checkJobs();
    });
  }
}
