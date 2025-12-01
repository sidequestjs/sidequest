import { Backend } from "@sidequest/backend";
import { JobData, logger } from "@sidequest/core";
import { ExecutorManager } from "./executor-manager";
import { QueueManager } from "./queue-manager";

/**
 * Dispatcher for managing job execution and queue polling.
 */
export class Dispatcher {
  /** Indicates if the dispatcher is currently running */
  private isRunning = false;

  /**
   * Creates a new Dispatcher.
   * @param backend The backend instance.
   * @param queueManager The queue manager instance.
   * @param executorManager The executor manager instance.
   */
  constructor(
    private backend: Backend,
    private queueManager: QueueManager,
    private executorManager: ExecutorManager,
    private sleepDelay: number,
  ) {}

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
          await this.sleep(this.sleepDelay);
          continue;
        }

        const globalSlots = this.executorManager.availableSlotsGlobal();
        if (globalSlots <= 0) {
          logger("Dispatcher").debug(`Global concurrency limit reached!`);
          await this.sleep(this.sleepDelay);
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
        await this.sleep(this.sleepDelay);
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
    logger("Dispatcher").debug(`Starting dispatcher...`);
    this.isRunning = true;
    void this.listen();
  }

  /**
   * Stops the dispatcher and waits for all active jobs to finish.
   * @returns A promise that resolves when all jobs are finished.
   */
  async stop() {
    this.isRunning = false;
    await this.executorManager.destroy();
  }
}
