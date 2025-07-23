import { SQLBackend } from "@sidequest/backend";
import { JobData, logger } from "@sidequest/core";
import { ExecutorManager } from "./executor-manager";
import { QueueManager } from "./queue-manager";

const sleepDelay = 100;

export class Dispatcher {
  private isRunning: boolean;
  private queueManager: QueueManager;
  private executorManager: ExecutorManager;
  backend: SQLBackend;

  constructor(backend: SQLBackend, queueManager: QueueManager, executorManager: ExecutorManager) {
    this.isRunning = false;
    this.queueManager = queueManager;
    this.executorManager = executorManager;
    this.backend = backend;
  }

  private async listen() {
    while (this.isRunning) {
      const queues = await this.queueManager.getQueuesWithRunnableJobs();

      let shouldSleep = true;

      for (const queue of queues) {
        const availableSlots = this.executorManager.availableSlotsByQueue(queue);
        if (availableSlots <= 0) {
          logger().debug(`queue ${queue.queue} limit reached!`);
          await this.sleep(sleepDelay);
          continue;
        }

        const globalSlots = this.executorManager.availableSlotsGlobal();
        if (globalSlots <= 0) {
          logger().debug(`Global concurrency limit reached!`);
          await this.sleep(sleepDelay);
          continue;
        }

        const jobs: JobData[] = await this.backend.claimPendingJob(queue.queue, availableSlots);

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
