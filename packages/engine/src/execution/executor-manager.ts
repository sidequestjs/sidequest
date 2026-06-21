import { Backend } from "@sidequest/backend";
import {
  CancelTransition,
  JobCanceled,
  JobData,
  JobTimeout,
  JobTransition,
  JobTransitionFactory,
  logger,
  QueueConfig,
  RetryTransition,
  RunTransition,
} from "@sidequest/core";
import { inspect } from "util";
import { NonNullableEngineConfig } from "../engine";
import { JobTransitioner } from "../job/job-transitioner";
import { InlineRunner, JobRunner, RunnerPool } from "../shared-runner";

/**
 * Manages job execution and worker concurrency for Sidequest.
 */
export class ExecutorManager {
  private activeByQueue: Record<string, Set<number>>;
  private activeJobs: Set<number>;
  private jobRunner: JobRunner;

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
    this.jobRunner =
      this.nonNullConfig.runner === "inline"
        ? new InlineRunner(this.nonNullConfig)
        : new RunnerPool(this.nonNullConfig);
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
    const controller = new AbortController();
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
    try {
      logger("Executor Manager").debug(`Submitting job ${job.id} for execution in queue ${queueConfig.name}`);
      // We call prepareJob here again to make sure the jobs are in the queues.
      // This might not be necessary, but for the sake of consistency we do it.
      this.queueJob(queueConfig, job);

      job = await JobTransitioner.apply(this.backend, job, new RunTransition());

      isRunning = true;
      const cancellationCheck = async () => {
        while (isRunning) {
          const watchedJob = await this.backend.getJob(job.id);
          if (watchedJob?.state === "canceled") {
            logger("Executor Manager").debug(`Aborting job ${job.id}: canceled`);
            controller.abort(new JobCanceled());
            isRunning = false;
            return;
          }
          await new Promise((r) => setTimeout(r, 1000));
        }
      };
      void cancellationCheck().catch((error) => {
        logger("Executor Manager").error(`Cancellation watcher for job ${job.id} failed:`, error);
      });

      logger("Executor Manager").debug(`Running job ${job.id} in queue ${queueConfig.name}`);

      const runPromise = this.jobRunner.run(job, controller.signal);

      if (job.timeout) {
        // Only signal the abort here. The terminal transition is decided when the run actually ends
        // (resolve or reject) so a still-running job is never re-queued underneath itself.
        timeoutHandle = setTimeout(() => {
          logger("Executor Manager").debug(`Job ${job.id} timed out after ${job.timeout}ms, aborting.`);
          controller.abort(new JobTimeout(job.timeout!));
        }, job.timeout);
      }

      const result = await runPromise;

      isRunning = false;
      // The job ran to a conclusion and returned a state (even if a timeout/cancel was signaled);
      // respect it and transition accordingly.
      logger("Executor Manager").debug(`Job ${job.id} settled with result: ${inspect(result)}`);
      await this.applyTerminalTransition(job, JobTransitionFactory.create(result));
    } catch (error: unknown) {
      isRunning = false;
      const err = error as Error;
      if (controller.signal.aborted) {
        // The run produced no result because the worker was hard-killed (thread). Only a clear
        // cancellation maps to canceled; every other abort reason (timeout, or anything else) defaults
        // to a retry as a failsafe. The rejection is logged so a real error during the abort is kept.
        const reason: unknown = controller.signal.reason;
        logger("Executor Manager").debug(`Job ${job.id} was hard-killed (${String(reason)}): ${err.message}`);
        const transition =
          reason instanceof JobCanceled
            ? new CancelTransition()
            : new RetryTransition(reason instanceof Error ? reason : new Error(`Job aborted: ${String(reason)}`));
        await this.applyTerminalTransition(job, transition);
      } else {
        logger("Executor Manager").error(`Unhandled error while executing job ${job.id}: ${err.message}`);
        await this.applyTerminalTransition(job, new RetryTransition(err));
      }
    } finally {
      isRunning = false;
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
      this.activeByQueue[queueConfig.name].delete(job.id);
      this.activeJobs.delete(job.id);
    }
  }

  /**
   * Applies a job's final transition, tolerating the job row having disappeared.
   *
   * A job's row can be deleted while it runs (cleanup routine, an explicit delete, or a test
   * truncating the table). Recording its terminal state is then impossible and safe to skip. This
   * must never throw: `execute` is fire-and-forget, so an error here would surface as an unhandled
   * rejection.
   *
   * @param job The job being finalized.
   * @param transition The terminal transition to apply.
   */
  private async applyTerminalTransition(job: JobData, transition: JobTransition): Promise<void> {
    try {
      await JobTransitioner.apply(this.backend, job, transition);
    } catch (error) {
      logger("Executor Manager").warn(
        `Could not record terminal state for job ${job.id} (it may no longer exist): ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Destroys the runner pool and releases resources.
   */
  async destroy(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const checkJobs = () => {
        if (this.totalActiveWorkers() === 0) {
          logger("ExecutorManager").info("All active jobs finished. Destroying runner.");
          try {
            this.jobRunner.destroy();
            logger("ExecutorManager").debug("Runner destroyed. Returning.");
            resolve();
          } catch (error) {
            logger("ExecutorManager").error("Error while destroying runner:", error);
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
