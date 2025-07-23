import { JobData, logger } from "@sidequest/core";
import { Engine, SidequestConfig } from "../engine";
import { ExecutorManager } from "./executor-manager";
import { QueueManager } from "./queue-manager";

const sleepDelay = 100;

export class Dispatcher {
  private isRunning: boolean;
  private queueManager: QueueManager;
  private executorManager: ExecutorManager;
  private config: SidequestConfig;

  constructor(config: SidequestConfig) {
    this.isRunning = false;
    this.queueManager = new QueueManager();
    this.config = config;
    this.executorManager = new ExecutorManager(config);
  }

  private async listen() {
    const backend = Engine.getBackend()!;

    while (this.isRunning) {
      const queues = await this.queueManager.getQueuesWithRunnableJobs(this.config);

      let shouldSleep = true;

      for (const queue of queues) {
        const availableSlots = this.executorManager.availableSlotsByQueue(queue);
        if (availableSlots <= 0) {
          logger().info(`queue ${queue.queue} limit reached!`);
          await this.sleep(sleepDelay);
          continue;
        }

        const globalSlots = this.executorManager.availableSlotsGlobal();
        if (globalSlots <= 0) {
          logger().info(`Concurrency limit reached (${this.config.maxConcurrentJobs ?? 10} jobs).`);
          await this.sleep(sleepDelay);
          continue;
        }

        const jobs: JobData[] = await backend.claimPendingJob(queue.queue, availableSlots);

        if (jobs.length > 0) {
          // if a job was found on any queue do not sleep
          shouldSleep = false;
        }

        for (const job of jobs) {
          // does not await for job execution.
          void this.executorManager.execute(queue, job);
        }
      }

      if (shouldSleep) {
        await this.sleep(sleepDelay);
      }
    }
  }

  private sleep(delay: number): Promise<void> {
    return new Promise((r) => setTimeout(r, delay));
  }

  start() {
    this.isRunning = true;
    void this.listen();
  }

  async stop() {
    this.isRunning = false;

    logger().info(
      `Shutting down worker... Awaiting for ${this.executorManager.totalActiveWorkers()} active jobs to finish...`,
    );

    await new Promise<void>((resolve) => {
      const checkJobs = () => {
        if (this.executorManager.totalActiveWorkers() === 0) {
          logger().info("All active jobs finished. Worker shutdown complete.");
          resolve();
        } else {
          logger().info(`Waiting for ${this.executorManager.totalActiveWorkers()} active jobs to finish...`);
          setTimeout(checkJobs, 1000);
        }
      };

      checkJobs();
    });
  }
}
