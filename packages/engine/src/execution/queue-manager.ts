import { Backend, NewQueueData } from "@sidequest/backend";
import { QueueConfig } from "@sidequest/core";
import { grantQueueConfig, QueueDefaults } from "../queue/grant-queue-config";

/**
 * Manages queue configurations and retrieves active queues with runnable jobs.
 */
export class QueueManager {
  /**
   * Creates a new QueueManager.
   * @param backend The backend instance.
   * @param queues The queue configurations to manage.
   * @param defaults Optional default queue settings.
   */
  constructor(
    private backend: Backend,
    private queues: NewQueueData[],
    private defaults?: QueueDefaults,
  ) {}

  /**
   * Gets all active queues that have runnable jobs, sorted by priority.
   * @returns A promise resolving to an array of active queue configs.
   */
  async getActiveQueuesWithRunnableJobs() {
    const queueNames = await this.backend.getQueuesFromJobs();

    const queues: QueueConfig[] = [];
    for (const queue of queueNames) {
      const fromConfig = this.queues.find((q) => q.name === queue);
      const queueConfig = await grantQueueConfig(this.backend, { ...fromConfig, name: queue }, this.defaults, false);
      if (queueConfig) {
        queues.push(queueConfig);
      }
    }

    return queues
      .filter((queue) => queue.state === "active")
      .sort((a, b) => {
        return (b.priority ?? 0) - (a.priority ?? 0);
      });
  }
}
