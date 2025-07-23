import { Sidequest } from "../../sidequest";
import logger from "../logger";
import { QueueConfig } from "../schema/queue-config";

export async function grantQueueConfig(queue: string, fallback?: QueueConfig){
  const backend = Sidequest.getBackend();
  const queueConfig = await backend.getQueueConfig(queue);
  if(queueConfig) return queueConfig;

  const defaultOptions = {
    queue: queue,
    concurrency: 10,
    state: 'active',
    priority: 0,
  }

  const newConfig = Object.assign({}, defaultOptions, fallback);

  logger().info(`creating queue config for ${queue}`);
  
  return backend.insertQueueConfig(newConfig);
}