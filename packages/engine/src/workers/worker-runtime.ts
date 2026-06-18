import { Backend } from "@sidequest/backend";
import { logger } from "@sidequest/core";
import cron, { ScheduledTask } from "node-cron";
import { NonNullableEngineConfig } from "../engine";
import { Dispatcher } from "../execution/dispatcher";
import { ExecutorManager } from "../execution/executor-manager";
import { QueueManager } from "../execution/queue-manager";
import { cleanupFinishedJobs } from "../routines/cleanup-finished-job";
import { releaseStaleJobs } from "../routines/release-stale-jobs";

/**
 * Owns the runtime side of the engine: the dispatcher loop plus the stale-job and finished-job
 * cron routines.
 *
 * It runs either inside the forked worker process (driven by {@link MainWorker}) or directly in the
 * host process when the engine is started with `fork: false`. It does NOT own the backend
 * lifecycle: closing the backend remains the responsibility of the {@link Engine} that created it.
 */
export class WorkerRuntime {
  private dispatcher: Dispatcher;
  private cronTasks: ScheduledTask[] = [];

  /**
   * Creates a new WorkerRuntime.
   * @param backend The backend instance.
   * @param config The non-nullable engine configuration.
   */
  constructor(
    private backend: Backend,
    private config: NonNullableEngineConfig,
  ) {
    this.dispatcher = new Dispatcher(
      backend,
      new QueueManager(backend, config.queues, config.queueDefaults),
      new ExecutorManager(backend, config),
      config.jobPollingInterval,
    );
  }

  /**
   * Starts the dispatcher loop and the cron routines.
   */
  async start(): Promise<void> {
    this.dispatcher.start();
    await this.startCron();
  }

  /**
   * Stops the cron routines and drains the dispatcher. Unlike the forked worker (which relies on
   * process exit), the in-process runtime must explicitly stop its cron tasks to avoid leaks.
   */
  async shutdown(): Promise<void> {
    logger("WorkerRuntime").debug("Stopping cron routines");
    // ScheduledTask.stop() returns `void | Promise<void>`; normalize before aggregating.
    await Promise.all(this.cronTasks.map((task) => Promise.resolve(task.stop())));
    this.cronTasks = [];
    logger("WorkerRuntime").debug("Stopping dispatcher");
    await this.dispatcher.stop();
  }

  /**
   * Schedules the stale-job and finished-job cron routines according to the config and runs each
   * once immediately. Either routine can be disabled with a `false` interval.
   */
  async startCron(): Promise<void> {
    const promises: Promise<unknown>[] = [];

    if (this.config.releaseStaleJobsIntervalMin !== false) {
      promises.push(
        this.scheduleAndRun(this.config.releaseStaleJobsIntervalMin, "ReleaseStaleJob", () =>
          releaseStaleJobs(
            this.backend,
            this.config.releaseStaleJobsMaxStaleMs,
            this.config.releaseStaleJobsMaxClaimedMs,
          ),
        ),
      );
    }

    if (this.config.cleanupFinishedJobsIntervalMin !== false) {
      promises.push(
        this.scheduleAndRun(this.config.cleanupFinishedJobsIntervalMin, "CleanupJob", () =>
          cleanupFinishedJobs(this.backend, this.config.cleanupFinishedJobsOlderThan),
        ),
      );
    }

    await Promise.all(promises).catch((error) => logger("WorkerRuntime").error(error));
  }

  /**
   * Schedules a recurring task at the given minute interval, tracks it for shutdown, and triggers
   * an immediate run.
   */
  private scheduleAndRun(intervalMin: number, name: string, task: () => Promise<unknown>): Promise<unknown> {
    logger("WorkerRuntime").debug(`Starting ${name} cron with interval: ${intervalMin} minutes`);
    const scheduled = cron.schedule(`*/${intervalMin} * * * *`, async () => {
      try {
        logger("WorkerRuntime").debug(`Running ${name} task`);
        await task();
      } catch (error: unknown) {
        logger("WorkerRuntime").error(`Error on running ${name}!`, error);
      }
    });
    this.cronTasks.push(scheduled);
    return scheduled.execute();
  }
}
