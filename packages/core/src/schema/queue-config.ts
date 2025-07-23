export type QueueState = "active" | "paused";

export interface QueueConfig {
  id?: number;
  queue: string;
  concurrency?: number;
  state?: QueueState;
  priority?: number;
}
