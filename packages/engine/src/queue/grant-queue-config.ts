import { Backend, NewQueueData } from "@sidequest/backend";
import { logger, QueueConfig } from "@sidequest/core";

/**
 * Represents the default configuration data for creating a new queue.
 * This type excludes the 'id' field from NewQueueData, as IDs are typically
 * generated automatically when creating new queue instances.
 */
export type QueueDefaults = Omit<NewQueueData, "id" | "name">;

/**
 * Determines if a new queue configuration differs from the existing queue configuration.
 *
 * Compares the provided queue data against the current queue configuration to detect
 * any changes in concurrency, state, or priority properties. Only checks properties
 * that are defined (truthy) in the new queue data.
 *
 * @param queue - The new queue data to compare against the existing configuration
 * @param queueConfig - The current queue configuration to compare against
 * @returns `true` if any of the defined properties in the new queue data differ from
 *          the corresponding properties in the existing configuration, `false` otherwise
 */
export function differentQueueConfig(queue: NewQueueData, queueConfig: QueueConfig) {
  return (
    (!!queue.concurrency && queue.concurrency !== queueConfig.concurrency) ||
    (!!queue.state && queue.state !== queueConfig.state) ||
    (!!queue.priority && queue.priority !== queueConfig.priority)
  );
}

/**
 * Ensures a queue configuration exists, creating it if necessary.
 * @param queue The name of the queue.
 * @param config Optional configuration for the new queue.
 * @returns The queue configuration.
 */
export async function grantQueueConfig(backend: Backend, queue: NewQueueData, defaults?: QueueDefaults) {
  const queueConfig = await backend?.getQueue(queue.name);
  if (queueConfig) {
    if (differentQueueConfig(queue, queueConfig)) {
      logger("Engine").warn(
        `Queue config for ${queue.name} exists but differs from the provided configuration. Updating...`,
      );
      return await backend.updateQueue({ ...queueConfig, ...queue });
    } else {
      return queueConfig;
    }
  }

  const newConfig: NewQueueData = {
    ...defaults,
    ...queue,
  };

  logger("Engine").info(`Creating queue config for ${queue.name}`);

  return backend?.createNewQueue(newConfig);
}
