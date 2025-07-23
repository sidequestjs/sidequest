import { JobData, logger, QueueConfig } from "@sidequest/core";
import { fork } from "child_process";
import path from "path";
import { grantQueueConfig } from "../queue/grant-queue-config";
import { Sidequest, SidequestConfig } from "../sidequest";

const executorPath = path.resolve(import.meta.dirname, "executor.js");

export class Worker {
  timeout?: NodeJS.Timeout;
  isRunning = false;

  allActiveJobs = new Set<ReturnType<typeof fork>>();
  activeJobsPerQueue: Record<string, Set<ReturnType<typeof fork>>> = {};

  async run(sidequestConfig: SidequestConfig) {
    await Sidequest.configure(sidequestConfig);
    this.isRunning = true;

    const maxConcurrentJobs = sidequestConfig.maxConcurrentJobs ?? 10;

    const heartBeat = async () => {
      try {
        const backend = Sidequest.getBackend();
        const queueNames = await backend.getQueuesFromJobs();
        const queues: QueueConfig[] = [];
        for (const queue of queueNames) {
          const queueConfig = await grantQueueConfig(queue, sidequestConfig?.queues?.[queue]);
          queues.push(queueConfig);
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

          const jobs: JobData[] = await backend.claimPendingJob(queueConfig.queue, availableSlots);

          for (const job of jobs) {
            const child = fork(executorPath);
            this.allActiveJobs.add(child);
            activeJobs.add(child);

            child.on("exit", () => {
              this.allActiveJobs.delete(child);
              activeJobs.delete(child);
            });

            const timeout = setTimeout(async () => {
              logger().error(`timeout on starting executor for job ${job.script}`);
              child.kill();
              job.state = "pending";
              await backend.updateJob(job);
            }, 2000);

            child.on("message", (msg) => {
              clearTimeout(timeout);
              if (msg === "ready") {
                child.send({ job, config: sidequestConfig });
              }
            });
          }
        }
      } catch (error) {
        logger().error(error);
      }

      if (this.isRunning) {
        this.timeout = setTimeout(() => void heartBeat(), 500);
      }
    };

    this.timeout = setTimeout(heartBeat, 100);
    logger().info(`Sidequest is up and running — using backend: "${sidequestConfig.backend?.driver}"`);
  }

  stop() {
    this.isRunning = false;
    clearTimeout(this.timeout);
  }
}

async function runWorker(sidequestConfig: SidequestConfig) {
  try {
    const worker = new Worker();
    await worker.run(sidequestConfig);
  } catch (error) {
    logger().error(error);
    process.exit(1);
  }
}

const isChildProcess = !!process.send;

if (isChildProcess) {
  process.on("message", (sidequestConfig: SidequestConfig) => void runWorker(sidequestConfig));

  process.on("disconnect", () => {
    logger().error("Parent process disconnected, exiting...");
    process.exit();
  });

  if (process.send) process.send("ready");
}
