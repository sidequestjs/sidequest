import { Backend } from "@sidequest/backend";
import { JobData, logger } from "@sidequest/core";
import { ExecutorManager } from "./executor-manager";
import { QueueManager } from "./queue-manager";

const sleepDelay = 100;

/**
 * Dispatcher for managing job execution and queue polling.
 */
export class Dispatcher {
  private isRunning: boolean;
  private queueManager: QueueManager;
  private executorManager: ExecutorManager;
  backend: Backend;

  /**
   * Creates a new Dispatcher.
   * @param backend The backend instance.
   * @param queueManager The queue manager instance.
   * @param executorManager The executor manager instance.
   */
  constructor(backend: Backend, queueManager: QueueManager, executorManager: ExecutorManager) {
    this.isRunning = false;
    this.queueManager = queueManager;
    this.executorManager = executorManager;
    this.backend = backend;
  }

  /**
   * Main loop for polling queues and dispatching jobs.
   * @private
   */
  private async listen() {
    while (this.isRunning) {
      const queues = await this.queueManager.getActiveQueuesWithRunnableJobs();

      let shouldSleep = true;

      for (const queue of queues) {
        const availableSlots = this.executorManager.availableSlotsByQueue(queue);
        if (availableSlots <= 0) {
          logger("Dispatcher").debug(`Queue ${queue.name} limit reached!`);
          await this.sleep(sleepDelay);
          continue;
        }

        const globalSlots = this.executorManager.availableSlotsGlobal();
        if (globalSlots <= 0) {
          logger("Dispatcher").debug(`Global concurrency limit reached!`);
          await this.sleep(sleepDelay);
          continue;
        }

        const jobs: JobData[] = await this.backend.claimPendingJob(queue.name, availableSlots);

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

  /**
   * Sleeps for the given delay in milliseconds.
   * @param delay The delay in milliseconds.
   * @returns A promise that resolves after the delay.
   * @private
   */
  private sleep(delay: number): Promise<void> {
    return new Promise((r) => setTimeout(r, delay));
  }

  /**
   * Starts the dispatcher loop.
   */
  start() {
    this.isRunning = true;
    logger("Dispatcher").debug(`Starting dispatcher...`);
    void this.listen();
  }

  /**
   * Stops the dispatcher and waits for all active jobs to finish.
   * @returns A promise that resolves when all jobs are finished.
   */
  async stop() {
    this.isRunning = false;

    logger("Dispatcher").info(
      `Shutting down worker... Awaiting for ${this.executorManager.totalActiveWorkers()} active jobs to finish...`,
    );

    await new Promise<void>((resolve) => {
      const checkJobs = () => {
        if (this.executorManager.totalActiveWorkers() === 0) {
          logger("Dispatcher").info("All active jobs finished. Worker shutdown complete.");
          resolve();
        } else {
          logger("Dispatcher").info(
            `Waiting for ${this.executorManager.totalActiveWorkers()} active jobs to finish...`,
          );
          setTimeout(checkJobs, 1000);
        }
      };

      checkJobs();
    });
  }
}
