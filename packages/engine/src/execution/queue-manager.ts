import { Backend } from "packages/backends/backend/dist";
import { QueueConfig } from "packages/core/dist";
import { SidequestConfig } from "../engine";
import { grantQueueConfig } from "../queue/grant-queue-config";

/**
 * Manages queue configurations and retrieves active queues with runnable jobs.
 */
export class QueueManager {
  /**
   * Creates a new QueueManager.
   * @param config The Sidequest configuration.
   * @param backend The backend instance.
   */
  constructor(
    private config: SidequestConfig,
    private backend: Backend,
  ) {}

  /**
   * Gets all active queues that have runnable jobs, sorted by priority.
   * @returns A promise resolving to an array of active queue configs.
   */
  async getActiveQueuesWithRunnableJobs() {
    const queueNames = await this.backend.getQueuesFromJobs();

    const queues: QueueConfig[] = [];
    for (const queue of queueNames) {
      const fromConfig = this.config?.queues?.find((q) => q.name === queue);
      const queueConfig = await grantQueueConfig(queue, fromConfig);
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
