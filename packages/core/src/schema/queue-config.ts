export type QueueState = "active" | "paused";

export interface QueueConfig {
  queue: string;
  concurrency?: number;
  state?: QueueState;
  priority?: number;
}
