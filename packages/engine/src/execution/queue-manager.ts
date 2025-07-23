import { QueueConfig } from "packages/core/dist";
import { Engine, SidequestConfig } from "../engine";
import { grantQueueConfig } from "../queue/grant-queue-config";

export class QueueManager {
  async getQueuesWithRunnableJobs(sidequestConfig?: SidequestConfig) {
    const backend = Engine.getBackend()!;

    const queueNames = await backend.getQueuesFromJobs();

    const queues: QueueConfig[] = [];
    for (const queue of queueNames) {
      const fromConfig = sidequestConfig?.queues?.find((q) => q.name === queue);
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
