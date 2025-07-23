export type QueueState = "active" | "paused";

export interface QueueConfig {
  id: number;
  name: string;
  concurrency: number;
  state: QueueState;
  priority: number;
}
