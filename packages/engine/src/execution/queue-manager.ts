import { SQLBackend } from "packages/backends/backend/dist";
import { QueueConfig } from "packages/core/dist";
import { SidequestConfig } from "../engine";
import { grantQueueConfig } from "../queue/grant-queue-config";

export class QueueManager {
  constructor(
    private config: SidequestConfig,
    private backend: SQLBackend,
  ) {}

  async getQueuesWithRunnableJobs() {
    const queueNames = await this.backend.getQueuesFromJobs();

    const queues: QueueConfig[] = [];
    for (const queue of queueNames) {
      const fromConfig = this.config?.queues?.find((q) => q.name === queue);
      const queueConfig = await grantQueueConfig(queue, fromConfig);
      if (queueConfig) {
        queues.push(queueConfig);
      }
    }

    return queues.sort((a, b) => {
      return (b.priority ?? 0) - (a.priority ?? 0);
    });
  }
}
