import { NewQueueData } from "@sidequest/backend";
import { logger } from "@sidequest/core";
import { Engine } from "../engine";

export async function grantQueueConfig(queue: string, config?: NewQueueData) {
  const backend = Engine.getBackend();
  const queueConfig = await backend?.getQueueConfig(queue);
  if (queueConfig) return queueConfig;

  const newConfig: NewQueueData = {
    ...config,
    name: queue,
  };

  logger().info(`creating queue config for ${queue}`);

  return backend?.insertQueueConfig(newConfig);
}
