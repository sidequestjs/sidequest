import { logger } from "@sidequest/core";
import type { ScheduledTask } from "node-cron";

/**
 * A registry for tracking and managing scheduled cron jobs.
 * This allows centralized control over all scheduled tasks for proper cleanup.
 */
export class ScheduledJobRegistry {
  private static scheduledTasks = new Map<string, ScheduledTask>();

  /**
   * Register a scheduled task in the registry.
   * @param task - The scheduled task to register
   * @returns A unique task ID for the registered task
   */
  static register(task: ScheduledTask): string {
    this.scheduledTasks.set(task.id, task);
    logger("CronRegistry").debug(`Registered scheduled task ${task.id}`);
    return task.id;
  }

  /**
   * Unregister and stop a specific scheduled task.
   * @param taskId - The ID of the task to unregister
   * @returns True if the task was found and stopped, false otherwise
   */
  static async stop(taskId: string) {
    const task = this.scheduledTasks.get(taskId);
    if (task) {
      try {
        await task.stop();
        logger("CronRegistry").debug(`Stopped scheduled task ${taskId}`);
        return true;
      } catch (error) {
        logger("CronRegistry").error(`Error stopping scheduled task ${taskId}:`, error);
        return false;
      } finally {
        this.scheduledTasks.delete(taskId);
        logger("CronRegistry").debug(`Unregistered scheduled task ${taskId}`);
      }
    }
    return false;
  }

  /**
   * Stop and unregister all scheduled tasks.
   * This should be called during application shutdown to ensure proper cleanup.
   */
  static async stopAll() {
    const taskCount = this.scheduledTasks.size;
    if (taskCount === 0) {
      logger("CronRegistry").debug("No scheduled tasks to stop");
      return;
    }

    logger("CronRegistry").info(`Stopping ${taskCount} scheduled task(s)...`);

    for (const [taskId, task] of this.scheduledTasks) {
      try {
        await task.stop();
        logger("CronRegistry").debug(`Stopped scheduled task ${taskId}`);
      } catch (error) {
        logger("CronRegistry").error(`Error stopping scheduled task ${taskId}:`, error);
      }
    }

    this.scheduledTasks.clear();
    logger("CronRegistry").info("All scheduled tasks stopped and registry cleared");
  }

  /**
   * Get the number of registered tasks.
   * @returns The count of registered tasks
   */
  static getTaskCount(): number {
    return this.scheduledTasks.size;
  }

  /**
   * Check if a task is registered.
   * @param taskId - The ID of the task to check
   * @returns True if the task is registered, false otherwise
   */
  static hasTask(taskId: string): boolean {
    return this.scheduledTasks.has(taskId);
  }
}
