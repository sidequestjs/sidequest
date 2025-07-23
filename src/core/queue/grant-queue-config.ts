import { Sidequest } from "../../sidequest";
import { QueueConfig } from "../schema/queue-config";

export function grantQueueConfig(queue: string, fallback?: QueueConfig){
  const backend = Sidequest.getBackend();
  const queueConfig = backend.getQueueConfig(queue);
  if(queueConfig) return queueConfig;

  const defaultOptions = {
    queue: queue,
    concurrency: 10,
    state: 'active'
  }

  const newConfig = Object.assign({}, defaultOptions, fallback);
  
  return backend.insertQueueConfig(newConfig);
}