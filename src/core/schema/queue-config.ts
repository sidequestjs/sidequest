export type QueueState = 'active' | 'paused';

export type QueueConfig = {
  queue: string,
  concurrency: number,
  state: QueueState,
}