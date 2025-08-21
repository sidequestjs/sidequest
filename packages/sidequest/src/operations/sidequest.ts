import { JobClassType, logger } from "@sidequest/core";
import { SidequestDashboard } from "@sidequest/dashboard";
import { Engine } from "@sidequest/engine";
import { JobOperations } from "./job";
import { QueueOperations } from "./queue";
import { KnownDrivers, SidequestConfig, SidequestEngineConfig } from "./types";

/**
 * Main entry point for the Sidequest job processing system.
 *
 * The Sidequest class provides static methods to configure, start, and build jobs
 * within the Sidequest ecosystem. It serves as a high-level interface that coordinates
 * the underlying Engine and Dashboard components.
 *
 * @example
 * ```typescript
 * // Configure and start Sidequest with dashboard
 * const engine = await Sidequest.start({
 *   // engine configuration
 *   dashboard: {
 *     // dashboard configuration
 *   }
 * });
 *
 * // Build and execute a job
 * const jobBuilder = Sidequest.build(MyJobClass);
 * ```
 */
export class Sidequest {
  /**
   * Static reference to the Engine instance used by Sidequest.
   * This allows access to the underlying engine for advanced operations.
   */
  private static engine = new Engine();

  /**
   * Static reference to the SidequestDashboard instance.
   * This provides access to the dashboard for monitoring and managing jobs and queues.
   */
  private static dashboard = new SidequestDashboard();

  /**
   * Provides access to the singleton QueueOperations instance for managing queues.
   *
   * @example
   * ```typescript
   * const updatedQueue = await Sidequest.queue.pauseQueue("default");
   * ```
   */
  static readonly queue = QueueOperations.instance;

  /**
   * Static reference to the JobOperations singleton instance.
   * Provides access to job-related operations and management functionality.
   *
   * @example
   * ```typescript
   * const jobData = Sidequest.job.get(jobId);
   * ```
   */
  static readonly job = JobOperations.instance;

  /**
   * Configures the Sidequest engine system with the provided configuration options.
   * This method only initializes the engine and does not start the engine or dashboard.
   * It is useful for when you want to set up the configuration without starting the job processing.
   *
   * @param config - Optional configuration object to customize Sidequest behavior
   * @returns A Promise that resolves when the configuration is complete
   *
   * @example
   * ```typescript
   * await Sidequest.configure({
   *   // configuration options
   * });
   * ```
   */
  static async configure<TDriver extends string = KnownDrivers>(config?: SidequestEngineConfig<TDriver>) {
    const _config = await this.engine.configure(config);
    const backend = this.engine.getBackend();
    this.job.setBackend(backend);
    this.queue.setBackend(backend);
    return _config;
  }

  /**
   * Starts the Sidequest engine and dashboard with the provided configuration.
   *
   * @param config - Optional configuration object that includes engine settings and dashboard configuration
   * @param config.dashboard - Dashboard-specific configuration, excluding backendConfig which is automatically provided
   * based on the engine configuration.
   * @returns A promise that resolves when the engine and dashboard are fully started.
   *
   * @example
   * ```typescript
   * const engine = await Sidequest.start({
   *   // engine config...
   *   dashboard: {
   *     port: 3000,
   *     // other dashboard options...
   *   }
   * });
   * ```
   */
  static async start<TDriver extends string = KnownDrivers>(config?: SidequestConfig<TDriver>) {
    try {
      const engineConfig = await this.configure(config);

      const engineStartPromise = this.engine.start(engineConfig);

      let dashboardStartPromise;
      if (config?.dashboard?.server) {
        dashboardStartPromise = this.dashboard.attach({
          ...config?.dashboard,
          backendConfig: engineConfig.backend,
        });
      } else {
        dashboardStartPromise = this.dashboard.start({ ...config?.dashboard, backendConfig: engineConfig.backend });
      }

      await engineStartPromise;
      await dashboardStartPromise;
    } catch (error) {
      logger().error("Failed to start Sidequest:", error);
      await this.stop(); // Ensure cleanup on error
      throw error; // Re-throw the error for further handling if needed
    }
  }

  /**
   * Stops the SideQuest instance by closing all active components.
   *
   * This method performs cleanup operations including:
   * - Closing the engine
   * - Clearing the job backend
   * - Clearing the queue backend
   * - Closing the dashboard
   *
   * @returns A promise that resolves when all cleanup operations are complete
   */
  static async stop() {
    await this.engine.close();
    this.job.setBackend(undefined);
    this.queue.setBackend(undefined);
    await this.dashboard.close();
  }

  /**
   * Builds a job class using a JobBuilder.
   *
   * @param JobClass The job class constructor.
   * @returns a JobBuilder that can be used to chain parameters and other job configurations.
   */
  static build<T extends JobClassType>(JobClass: T) {
    return this.engine.build(JobClass);
  }

  /**
   * Gets the backend instance from the Sidequest engine.
   * This is useful for advanced operations that require direct access to the backend.
   *
   * @returns The backend instance.
   * @throws Error if the engine is not configured.
   */
  static getBackend() {
    return this.engine.getBackend();
  }
}
