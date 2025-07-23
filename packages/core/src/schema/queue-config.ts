/**
 * Represents the possible states of a queue.
 * - "active": The queue is currently processing items.
 * - "paused": The queue has been paused and is not processing items.
 */
export type QueueState = "active" | "paused";

/**
 * Configuration options for a queue instance.
 */
export interface QueueConfig {
  /**
   * Unique identifier for the queue.
   */
  id: number;

  /**
   * Human-readable name for the queue.
   */
  name: string;

  /**
   * Maximum number of concurrent jobs the queue can process.
   */
  concurrency: number;

  /**
   * Current operational state of the queue.
   */
  state: QueueState;

  /**
   * Priority value used to determine the queue's processing order.
   */
  priority: number;
}
