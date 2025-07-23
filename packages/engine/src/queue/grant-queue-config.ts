import { NewQueueData } from "@sidequest/backend";
import { logger } from "@sidequest/core";
import { Engine } from "../engine";

/**
 * Ensures a queue configuration exists, creating it if necessary.
 * @param queue The name of the queue.
 * @param config Optional configuration for the new queue.
 * @returns The queue configuration.
 */
export async function grantQueueConfig(queue: string, config?: NewQueueData) {
  const backend = Engine.getBackend();
  const queueConfig = await backend?.getQueueConfig(queue);
  if (queueConfig) return queueConfig;

  const newConfig: NewQueueData = {
    ...config,
    name: queue,
  };

  logger("Engine").info(`Creating queue config for ${queue}`);

  return backend?.insertQueueConfig(newConfig);
}
