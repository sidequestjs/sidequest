import { DuplicatedJobError, JobData, logger, QueueConfig, RetryTransition } from "@sidequest/core";
import { fork } from "child_process";
import cron from "node-cron";
import path from "path";
import { Engine, SidequestConfig } from "../engine";
import { CleanupFinishedJobs } from "../internal-jobs/cleanup-finished-job";
import { ReleaseStaleJob } from "../internal-jobs/release-stale-jobs";
import { JobTransitioner } from "../job/job-transitioner";
import { grantQueueConfig } from "../queue/grant-queue-config";
import { gracefulShutdown } from "../utils/shutdown";

const executorPath = path.resolve(import.meta.dirname, "executor.js");

let shuttingDown = false;
let worker: Worker | undefined;

export class Worker {
  timeout?: NodeJS.Timeout;
  isRunning = false;

  allActiveJobs = new Set<ReturnType<typeof fork>>();
  activeJobsPerQueue: Record<string, Set<ReturnType<typeof fork>>> = {};

  async run(sidequestConfig: SidequestConfig) {
    sidequestConfig = await Engine.configure(sidequestConfig);
    this.isRunning = true;

    const maxConcurrentJobs = sidequestConfig.maxConcurrentJobs ?? 10;

    const heartBeat = async () => {
      logger().debug("Worker heart beat...");
      try {
        const backend = Engine.getBackend();
        const queueNames = await backend!.getQueuesFromJobs();
        const queues: QueueConfig[] = [];
        for (const queue of queueNames) {
          const queueConfig = await grantQueueConfig(queue, sidequestConfig?.queues?.[queue]);
          if (queueConfig) {
            queues.push(queueConfig);
          }
        }
        queues.sort((a, b) => {
          return (b.priority ?? 0) - (a.priority ?? 0);
        });

        for (const queueConfig of queues) {
          if (!this.activeJobsPerQueue[queueConfig.queue]) {
            this.activeJobsPerQueue[queueConfig.queue] = new Set();
          }
          const activeJobs = this.activeJobsPerQueue[queueConfig.queue];
          const limit = queueConfig.concurrency ?? 10;

          if (activeJobs.size >= limit) {
            logger().debug(`queue ${queueConfig.queue} limit reached!`);
            continue;
          }

          if (this.allActiveJobs.size >= maxConcurrentJobs) {
            logger().debug(
              `Concurrency limit reached (${maxConcurrentJobs} jobs). Skipping queue "${queueConfig.queue}" until slots free up.`,
            );
            continue;
          }

          const availableSlots = limit - activeJobs.size;

          const jobs: JobData[] = await backend!.claimPendingJob(queueConfig.queue, availableSlots);

          for (const job of jobs) {
            const child = fork(executorPath);
            this.allActiveJobs.add(child);
            activeJobs.add(child);

            child.on("exit", () => {
              this.allActiveJobs.delete(child);
              activeJobs.delete(child);
            });

            const startTimeout = setTimeout(() => {
              logger().error(`timeout on starting executor for job ${job.script}`);
              child.kill();
              // TODO: create a JobTransition for this.
              job.state = "waiting";
              void backend!.updateJob(job);
            }, 2000);

            child.on("message", (msg) => {
              if (msg === "ready") {
                clearTimeout(startTimeout);
                let jobTimeout: NodeJS.Timeout | undefined;
                let timedOut = false;

                child.on("exit", (code) => {
                  if (jobTimeout) clearTimeout(jobTimeout);
                  if (code && code > 0 && !timedOut) {
                    void JobTransitioner.apply(
                      job,
                      new RetryTransition(new Error(`Executor exited with code ${code}`)),
                    );
                  }
                });

                child.send({ type: "execute", job, config: sidequestConfig });

                if (job.timeout) {
                  jobTimeout = setTimeout(() => {
                    timedOut = true;
                    child.send({ type: "shutdown" });
                    const error = `Executor for job ${job.script} timed out after ${job.timeout}ms`;
                    void JobTransitioner.apply(job, new RetryTransition(error));
                  }, job.timeout);
                }
              }
            });
          }
        }
      } catch (error) {
        logger().error(error);
      }

      if (this.isRunning && !shuttingDown) {
        this.timeout = setTimeout(() => void heartBeat(), 500);
      }
    };

    this.timeout = setTimeout(() => void heartBeat(), 100);
    logger().info(`Sidequest is up and running — using backend: "${sidequestConfig.backend?.driver}"`);
  }

  stop() {
    this.isRunning = false;
    clearTimeout(this.timeout);
  }

  async shutdown() {
    shuttingDown = true;
    logger().info(`Shutting down worker... Awaiting for ${this.allActiveJobs.size} active jobs to finish...`);
    await new Promise<void>((resolve) => {
      const checkJobs = () => {
        if (this.allActiveJobs.size === 0) {
          logger().info("All active jobs finished. Worker shutdown complete.");
          resolve();
        } else {
          logger().info(`Waiting for ${this.allActiveJobs.size} active jobs to finish...`);
          setTimeout(checkJobs, 1000);
        }
      };

      checkJobs();
    });
  }
}

export async function runWorker(sidequestConfig: SidequestConfig) {
  try {
    worker = new Worker();
    await worker.run(sidequestConfig);

    startCron();
  } catch (error) {
    logger().error(error);
    process.exit(1);
  }
}

async function shutdown() {
  if (!shuttingDown) {
    await worker?.shutdown();
    await Engine.close();
  }
}

export function startCron() {
  const releaseTask = cron.schedule("*/5 * * * *", async () => {
    try {
      await Engine.build(ReleaseStaleJob)!
        .queue("sidequest_internal")
        .unique({ period: "second" })
        .timeout(10_000)
        .enqueue();
    } catch (error: unknown) {
      if (error instanceof DuplicatedJobError) {
        logger().debug("ReleaseStaleJob already scheduled by another worker");
      } else {
        logger().error("Error on enqueuing ReleaseStaleJob!", error);
      }
    }
  });

  const cleanupTask = cron.schedule("0 * * * *", async () => {
    try {
      await Engine.build(CleanupFinishedJobs)!
        .queue("sidequest_internal")
        .unique({ period: "hour" })
        .timeout(10_000)
        .enqueue();
    } catch (error: unknown) {
      if (error instanceof DuplicatedJobError) {
        logger().debug("CleanupJob already scheduled by another worker");
      } else {
        logger().error("Error on enqueuing CleanupJob!", error);
      }
    }
  });

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
