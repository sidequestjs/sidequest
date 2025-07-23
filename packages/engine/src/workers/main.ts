import { logger } from "@sidequest/core";
import cron from "node-cron";
import { Engine, EngineConfig, NonNullableEngineConfig } from "../engine";
import { Dispatcher } from "../execution/dispatcher";
import { ExecutorManager } from "../execution/executor-manager";
import { QueueManager } from "../execution/queue-manager";
import { cleanupFinishedJobs } from "../routines/cleanup-finished-job";
import { releaseStaleJobs } from "../routines/release-stale-jobs";
import { gracefulShutdown } from "../utils/shutdown";

let shuttingDown = false;
let dispatcher: Dispatcher | undefined;

/**
 * Starts a Sidequest worker process with the given configuration.
 * @param sidequestConfig The Sidequest configuration for the worker.
 */
export async function runWorker(sidequestConfig: EngineConfig) {
  try {
    const nonNullConfig = await Engine.configure(sidequestConfig);
    const backend = Engine.getBackend()!;

    dispatcher = new Dispatcher(
      backend,
      new QueueManager(backend, nonNullConfig.queues),
      new ExecutorManager(backend, nonNullConfig.maxConcurrentJobs, nonNullConfig.minThreads, nonNullConfig.maxThreads),
    );
    dispatcher.start();

    await startCron(
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
}

/**
 * Gracefully shuts down the worker and releases resources.
 */
async function shutdown() {
  if (!shuttingDown) {
    shuttingDown = true;
    await dispatcher?.stop();
    await Engine.close();
  }
}

/**
 * Starts cron job for releasing stale jobs.
 * Also executes the task immediately.
 */
async function startAndExecuteStaleJobsReleaseCron(
  intervalMin: number,
  maxStaleMs: number,
  maxClaimedMs: number,
): Promise<unknown> {
  logger("Worker").debug(`Starting stale jobs release cron with interval: ${intervalMin} minutes`);
  const releaseTask = cron.schedule(`*/${intervalMin} * * * *`, async () => {
    try {
      logger("Worker").debug("Running stale jobs release task");
      await releaseStaleJobs(Engine.getBackend()!, maxStaleMs, maxClaimedMs);
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
async function startAndExecuteFinishedJobsCleanupCron(intervalMin: number, cutoffMs: number): Promise<unknown> {
  logger("Worker").debug(`Starting finished jobs cleanup cron with interval: ${intervalMin} minutes`);
  const cleanupTask = cron.schedule(`*/${intervalMin} * * * *`, async () => {
    try {
      logger("Worker").debug("Running finished jobs cleanup task");
      await cleanupFinishedJobs(Engine.getBackend()!, cutoffMs);
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
export async function startCron(
  staleIntervalMin: number | false,
  maxStaleMs: number,
  maxClaimedMs: number,
  cleanupIntervalMin: number | false,
  cleanupCutoffMs: number,
) {
  logger("Worker").debug("Starting cron jobs");
  const promises: Promise<unknown>[] = [];

  if (staleIntervalMin !== false) {
    promises.push(startAndExecuteStaleJobsReleaseCron(staleIntervalMin, maxStaleMs, maxClaimedMs));
  }

  if (cleanupIntervalMin !== false) {
    promises.push(startAndExecuteFinishedJobsCleanupCron(cleanupIntervalMin, cleanupCutoffMs));
  }

  await Promise.all(promises).catch((error) => {
    logger("Worker").error(error);
  });
}

const isChildProcess = !!process.send;

if (isChildProcess) {
  process.on(
    "message",
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    async ({ type, sidequestConfig }: { type: string; sidequestConfig?: NonNullableEngineConfig }) => {
      if (type === "start") {
        if (!sidequestConfig) {
          throw new Error("No Sidequest configuration provided to worker!");
        }
        if (!shuttingDown) {
          gracefulShutdown(shutdown, "Worker", sidequestConfig.gracefulShutdown);
          logger("Worker").info("Starting worker with provided configuration...");
          return await runWorker(sidequestConfig);
        } else {
          logger("Worker").warn("Worker is already shutting down, ignoring start signal.");
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
