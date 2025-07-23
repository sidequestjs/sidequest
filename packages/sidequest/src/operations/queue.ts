import { Backend, NewQueueData } from "@sidequest/backend";
import { QueueConfig, QueueState } from "@sidequest/core";
import { Engine } from "@sidequest/engine";

/**
 * Entry point for managing queues in Sidequest.
 *
 * Provides high-level methods for queue management operations including
 * state changes, concurrency updates, priority adjustments, and listing.
 */
export class QueueOperations {
  /**
   * Singleton instance of QueueOperations.
   * This allows for easy access to queue management methods without needing to instantiate the class.
   */
  static readonly instance = new QueueOperations();

  /**
   * Private constructor to enforce singleton pattern.
   * Prevents instantiation from outside the class.
   */
  private constructor() {
    // noop
  }

  /**
   * Gets the backend instance from the engine.
   * @returns The backend instance.
   * @throws Error if the engine is not configured.
   */
  private getBackend(): Backend {
    const backend = Engine.getBackend();
    if (!backend) {
      throw new Error("Engine not configured. Call Sidequest.configure() or Sidequest.start() first.");
    }
    return backend;
  }

  /**
   * Toggles the queue state between active and paused.
   * If the queue is active, it will be paused. If it's paused, it will be activated.
   *
   * @param queueName - The name of the queue to toggle
   * @returns Promise resolving to the updated queue configuration
   * @throws Error if the queue is not found
   */
  async toggle(queueName: string): Promise<QueueConfig> {
    const backend = this.getBackend();
    const queue = await backend.getQueue(queueName);

    if (!queue) {
      throw new Error(`Queue '${queueName}' not found`);
    }

    const newState: QueueState = queue.state === "active" ? "paused" : "active";
    return await backend.updateQueue({ ...queue, state: newState });
  }

  /**
   * Pauses the specified queue.
   * Jobs already running will continue, but no new jobs will be started.
   *
   * @param queueName - The name of the queue to pause
   * @returns Promise resolving to the updated queue configuration
   * @throws Error if the queue is not found
   */
  async pause(queueName: string): Promise<QueueConfig> {
    const backend = this.getBackend();
    const queue = await backend.getQueue(queueName);

    if (!queue) {
      throw new Error(`Queue '${queueName}' not found`);
    }

    return await backend.updateQueue({ ...queue, state: "paused" });
  }

  /**
   * Activates the specified queue.
   * The queue will resume processing jobs normally.
   *
   * @param queueName - The name of the queue to activate
   * @returns Promise resolving to the updated queue configuration
   * @throws Error if the queue is not found
   */
  async activate(queueName: string): Promise<QueueConfig> {
    const backend = this.getBackend();
    const queue = await backend.getQueue(queueName);

    if (!queue) {
      throw new Error(`Queue '${queueName}' not found`);
    }

    return await backend.updateQueue({ ...queue, state: "active" });
  }

  /**
   * Sets the concurrency limit for the specified queue.
   * This controls the maximum number of jobs that can run concurrently in this queue.
   *
   * @param queueName - The name of the queue to update
   * @param concurrency - The new concurrency limit (must be positive)
   * @returns Promise resolving to the updated queue configuration
   * @throws Error if the queue is not found or concurrency is invalid
   */
  async setConcurrency(queueName: string, concurrency: number): Promise<QueueConfig> {
    if (concurrency < 0) {
      throw new Error("Concurrency must be a positive number or 0 for unlimited");
    }

    const backend = this.getBackend();
    const queue = await backend.getQueue(queueName);

    if (!queue) {
      throw new Error(`Queue '${queueName}' not found`);
    }

    return await backend.updateQueue({ ...queue, concurrency });
  }

  /**
   * Sets the priority for the specified queue.
   * Higher priority queues are processed before lower priority ones.
   *
   * @param queueName - The name of the queue to update
   * @param priority - The new priority value (higher values = higher priority)
   * @returns Promise resolving to the updated queue configuration
   * @throws Error if the queue is not found
   */
  async setPriority(queueName: string, priority: number): Promise<QueueConfig> {
    const backend = this.getBackend();
    const queue = await backend.getQueue(queueName);

    if (!queue) {
      throw new Error(`Queue '${queueName}' not found`);
    }

    return await backend.updateQueue({ ...queue, priority });
  }

  /**
   * Creates a new queue with the specified configuration.
   *
   * @param queueData - The queue configuration data
   * @param queueData.name - The unique name for the queue (required)
   * @param queueData.concurrency - The maximum number of concurrent jobs (optional, defaults to backend fallback)
   * @param queueData.priority - The queue priority (optional, defaults to backend fallback)
   * @param queueData.state - The initial queue state (optional, defaults to backend fallback)
   * @returns Promise resolving to the created queue configuration
   * @throws Error if a queue with the same name already exists
   */
  async create(queueData: NewQueueData): Promise<QueueConfig> {
    const backend = this.getBackend();

    // Check if queue already exists
    const existingQueue = await backend.getQueue(queueData.name);
    if (existingQueue) {
      throw new Error(`Queue '${queueData.name}' already exists`);
    }

    return await backend.createNewQueue(queueData);
  }

  /**
   * Gets the configuration for a specific queue by name.
   *
   * @param queueName - The name of the queue to retrieve
   * @returns Promise resolving to the queue configuration if found, undefined otherwise
   */
  async get(queueName: string): Promise<QueueConfig | undefined> {
    const backend = this.getBackend();
    return await backend.getQueue(queueName);
  }

  /**
   * Lists all queues with optional ordering.
   *
   * @param orderBy - Optional ordering configuration
   * @param orderBy.column - The column to order by (defaults to 'priority')
   * @param orderBy.order - The order direction (defaults to 'desc')
   * @returns Promise resolving to an array of queue configurations
   */
  async list(orderBy?: { column?: keyof QueueConfig; order?: "asc" | "desc" }): Promise<QueueConfig[]> {
    const backend = this.getBackend();
    return await backend.listQueues(orderBy);
  }
}
