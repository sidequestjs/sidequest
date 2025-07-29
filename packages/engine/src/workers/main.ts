import { Backend } from "@sidequest/backend";
import { logger } from "@sidequest/core";
import cron from "node-cron";
import { Engine, EngineConfig, NonNullableEngineConfig } from "../engine";
import { Dispatcher } from "../execution/dispatcher";
import { ExecutorManager } from "../execution/executor-manager";
import { QueueManager } from "../execution/queue-manager";
import { cleanupFinishedJobs } from "../routines/cleanup-finished-job";
import { releaseStaleJobs } from "../routines/release-stale-jobs";
import { gracefulShutdown } from "../utils/shutdown";

export class MainWorker {
  shuttingDown = false;
  private dispatcher: Dispatcher | undefined;
  private engine = new Engine();
  private backend?: Backend;

  /**
   * Starts a Sidequest worker process with the given configuration.
   * @param sidequestConfig The Sidequest configuration for the worker.
   */
  async runWorker(sidequestConfig: EngineConfig) {
    if (!this.shuttingDown) {
      try {
        const nonNullConfig = await this.engine.configure(sidequestConfig);
        this.backend = this.engine.getBackend()!;

        this.dispatcher = new Dispatcher(
          this.backend,
          new QueueManager(this.backend, nonNullConfig.queues, nonNullConfig.queueDefaults),
          new ExecutorManager(
            this.backend,
            nonNullConfig.maxConcurrentJobs,
            nonNullConfig.minThreads,
            nonNullConfig.maxThreads,
          ),
        );
        this.dispatcher.start();

        await this.startCron(
          nonNullConfig.releaseStaleJobsIntervalMin,
          nonNullConfig.releaseStaleJobsMaxStaleMs,
          nonNullConfig.releaseStaleJobsMaxClaimedMs,
          nonNullConfig.cleanupFinishedJobsIntervalMin,
          nonNullConfig.cleanupFinishedJobsOlderThan,
        );
      } catch (error) {
        logger("Worker").error(error);
        process.exit(1);
      }
    } else {
      logger("Worker").warn("Worker is already shutting down, ignoring run signal.");
    }
  }

  /**
   * Gracefully shuts down the worker and releases resources.
   */
  async shutdown() {
    if (!this.shuttingDown) {
      this.shuttingDown = true;
      await this.dispatcher?.stop();
      await this.engine.close();
    }
  }

  /**
   * Starts cron job for releasing stale jobs.
   * Also executes the task immediately.
   */
  async startAndExecuteStaleJobsReleaseCron(
    intervalMin: number,
    maxStaleMs: number,
    maxClaimedMs: number,
  ): Promise<unknown> {
    if (!this.backend) {
      throw new Error("Backend is not initialized. Cannot start stale jobs release cron.");
    }

    logger("Worker").debug(`Starting stale jobs release cron with interval: ${intervalMin} minutes`);
    const releaseTask = cron.schedule(`*/${intervalMin} * * * *`, async () => {
      try {
        logger("Worker").debug("Running stale jobs release task");
        await releaseStaleJobs(this.backend!, maxStaleMs, maxClaimedMs);
      } catch (error: unknown) {
        logger("Worker").error("Error on running ReleaseStaleJob!", error);
      }
    });
    return releaseTask.execute();
  }

  /**
   * Starts cron job for cleaning up finished jobs.
   * Also executes the task immediately.
   */
  async startAndExecuteFinishedJobsCleanupCron(intervalMin: number, cutoffMs: number): Promise<unknown> {
    if (!this.backend) {
      throw new Error("Backend is not initialized. Cannot start finished jobs cleanup cron.");
    }

    logger("Worker").debug(`Starting finished jobs cleanup cron with interval: ${intervalMin} minutes`);
    const cleanupTask = cron.schedule(`*/${intervalMin} * * * *`, async () => {
      try {
        logger("Worker").debug("Running finished jobs cleanup task");
        await cleanupFinishedJobs(this.backend!, cutoffMs);
      } catch (error: unknown) {
        logger("Worker").error("Error on running CleanupJob!", error);
      }
    });
    return cleanupTask.execute();
  }

  /**
   * Starts cron jobs for releasing stale jobs and cleaning up finished jobs.
   *
   * @param staleIntervalMin Interval in minutes for releasing stale jobs, or false to disable.
   * @param maxStaleMs Maximum age in milliseconds for stale jobs.
   * @param maxClaimedMs Maximum age in milliseconds for claimed jobs.
   * @param cleanupIntervalMin Interval in minutes for cleaning up finished jobs, or false to disable
   * @param cleanupCutoffMs Maximum age in milliseconds for finished jobs to be cleaned up.
   */
  async startCron(
    staleIntervalMin: number | false,
    maxStaleMs: number,
    maxClaimedMs: number,
    cleanupIntervalMin: number | false,
    cleanupCutoffMs: number,
  ) {
    logger("Worker").debug("Starting cron jobs");
    const promises: Promise<unknown>[] = [];

    if (staleIntervalMin !== false) {
      promises.push(this.startAndExecuteStaleJobsReleaseCron(staleIntervalMin, maxStaleMs, maxClaimedMs));
    }

    if (cleanupIntervalMin !== false) {
      promises.push(this.startAndExecuteFinishedJobsCleanupCron(cleanupIntervalMin, cleanupCutoffMs));
    }

    await Promise.all(promises).catch((error) => {
      logger("Worker").error(error);
    });
  }
}

const isChildProcess = !!process.send;

if (isChildProcess) {
  const worker = new MainWorker();

  process.on(
    "message",
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    async ({ type, sidequestConfig }: { type: string; sidequestConfig?: NonNullableEngineConfig }) => {
      if (type === "start") {
        if (!sidequestConfig) {
          throw new Error("No Sidequest configuration provided to worker!");
        }
        if (!worker.shuttingDown) {
          gracefulShutdown(worker.shutdown.bind(worker), "Worker", sidequestConfig.gracefulShutdown);
          logger("Worker").info("Starting worker with provided configuration...");
          return await worker.runWorker(sidequestConfig);
        } else {
          logger("Worker").warn("Worker is already shutting down, ignoring start signal.");
        }
      } else if (type === "shutdown") {
        if (!worker.shuttingDown) {
          logger("Worker").info("Received shutdown message, shutting down worker...");
          await worker.shutdown();
          logger("Worker").info("Worker shutdown complete.");
          process.exit(0);
        } else {
          logger("Worker").debug("Worker is already shutting down, ignoring shutdown signal.");
        }
      }
    },
  );

  process.on("disconnect", () => {
    logger("Worker").error("Parent process disconnected, exiting...");
    process.exit();
  });

  if (process.send) process.send("ready");
}
