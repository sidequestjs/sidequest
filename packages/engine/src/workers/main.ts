import { DuplicatedJobError, logger } from "@sidequest/core";
import cron from "node-cron";
import { Engine, SidequestConfig } from "../engine";
import { Dispatcher } from "../execution/dispatcher";
import { ExecutorManager } from "../execution/executor-manager";
import { QueueManager } from "../execution/queue-manager";
import { cleanupFinishedJobs } from "../routines/cleanup-finished-job";
import { releaseStaleJobs } from "../routines/release-stale-jobs";
import { gracefulShutdown } from "../utils/shutdown";

let shuttingDown = false;
let dispatcher: Dispatcher | undefined;

export async function runWorker(sidequestConfig: SidequestConfig) {
  try {
    await Engine.configure(sidequestConfig);
    const backend = Engine.getBackend()!;

    dispatcher = new Dispatcher(
      backend,
      new QueueManager(sidequestConfig, backend),
      new ExecutorManager(sidequestConfig),
    );
    dispatcher.start();

    startCron(sidequestConfig);
  } catch (error) {
    logger().error(error);
    process.exit(1);
  }
}

async function shutdown() {
  if (!shuttingDown) {
    await dispatcher?.stop();
    await Engine.close();
  }
  shuttingDown = true;
}

export function startCron(config: SidequestConfig) {
  const releaseTask = cron.schedule("0 * * * *", async () => {
    try {
      await releaseStaleJobs(Engine.getBackend()!)
    } catch (error: unknown) {
      logger().error("Error on enqueuing ReleaseStaleJob!", error);
    }
  });

  const cleanupTask = cron.schedule("0 * * * *", async () => {
    try {
      await cleanupFinishedJobs(Engine.getBackend()!)
    } catch (error: unknown) {
      logger().error("Error on enqueuing CleanupJob!", error);
    }
  });

  void releaseTask.execute();
  void cleanupTask.execute();

  Promise.all([releaseTask, cleanupTask]).catch((error) => {
    logger().error(error);
  });
}

const isChildProcess = !!process.send;

if (isChildProcess) {
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  process.on("message", async ({ type, sidequestConfig }: { type: string; sidequestConfig?: SidequestConfig }) => {
    if (type === "shutdown") {
      logger().info("Received shutdown signal, stopping worker...");
      await shutdown();
    } else if (type === "start") {
      if (!shuttingDown) {
        logger().info("Starting worker with provided configuration...");
        return await runWorker(sidequestConfig!);
      } else {
        logger().warn("Worker is already shutting down, ignoring start signal.");
      }
    }
  });

  process.on("disconnect", () => {
    logger().error("Parent process disconnected, exiting...");
    process.exit();
  });

  if (process.send) process.send("ready");

  gracefulShutdown(shutdown, "Worker");
}
