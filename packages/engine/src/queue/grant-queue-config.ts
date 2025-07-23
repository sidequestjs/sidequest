import { logger, QueueConfig } from "@sidequest/core";
import { Engine } from "../engine";

export async function grantQueueConfig(queue: string, fallback?: QueueConfig) {
  const backend = Engine.getBackend();
  const queueConfig = await backend?.getQueueConfig(queue);
  if (queueConfig) return queueConfig;

  const defaultOptions = {
    queue: queue,
    concurrency: 10,
    state: "active",
    priority: 0,
  };

  const newConfig = Object.assign({}, defaultOptions, fallback);

  logger().info(`creating queue config for ${queue}`);

  return backend?.insertQueueConfig(newConfig);
}
