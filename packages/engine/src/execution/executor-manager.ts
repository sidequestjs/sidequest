import { Backend } from "@sidequest/backend";
import {
  JobCanceled,
  JobData,
  JobTimeout,
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
    const inline = this.nonNullConfig.runner === "inline";
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
          // The row can be missing transiently or if it was deleted; treat that as "not canceled"
          // rather than dereferencing undefined and crashing the polling loop.
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
        timeoutHandle = setTimeout(() => {
          logger("Executor Manager").debug(`Job ${job.id} timed out after ${job.timeout}ms, aborting.`);
          controller.abort(new JobTimeout(job.timeout!));
          // A thread worker is terminated on abort and rejects without a result, so the retry must be
          // applied here. In inline mode the job cannot be force-stopped, so the timeout only signals:
          // the terminal state is decided by the job's own result when it settles (below).
          if (!inline) {
            void JobTransitioner.apply(this.backend, job, new RetryTransition(`Job timed out after ${job.timeout}ms`));
          }
        }, job.timeout);
      }

      const result = await runPromise;

      isRunning = false;
      // Inline runs cannot be force-stopped, so the job's settled result is authoritative even when an
      // abort (timeout/cancel) was requested: a job that honored the signal returns its own result, and
      // one that ignored it simply completes. In thread mode the abort already decided the terminal
      // state, so a job that ignored the signal must not overwrite the canceled/retry state.
      if (inline || !controller.signal.aborted) {
        logger("Executor Manager").debug(`Job ${job.id} completed with result: ${inspect(result)}`);
        const transition = JobTransitionFactory.create(result);
        await JobTransitioner.apply(this.backend, job, transition);
      }
    } catch (error: unknown) {
      isRunning = false;
      const err = error as Error;
      // The thread runner rejects the run when its worker is aborted. Detect that via the signal
      // rather than the rejection message (which varies). The terminal state was already set by the
      // timeout (retry) or cancellation (canceled) path, so there is nothing more to do here.
      if (controller.signal.aborted) {
        // The terminal state was already decided by the timeout (retry) or cancellation (canceled)
        // path. Log the underlying rejection so a real error during an aborted run is not lost.
        logger("Executor Manager").debug(
          `Job ${job.id} was aborted (${String(controller.signal.reason)}); ignoring rejection: ${err.message}`,
        );
      } else {
        logger("Executor Manager").error(`Unhandled error while executing job ${job.id}: ${err.message}`);
        await JobTransitioner.apply(this.backend, job, new RetryTransition(err));
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
