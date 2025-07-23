import { DashboardConfig, SidequestDashboard } from "@sidequest/dashboard";
import { Engine, EngineConfig, JobClassType } from "@sidequest/engine";
import { JobOperations } from "./job";
import { QueueOperations } from "./queue";

export type SidequestConfig = EngineConfig & {
  dashboard?: Omit<DashboardConfig, "backendConfig">;
};

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
   * const jobBuilder = Sidequest.job.build(MyJobClass);
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
  static async configure(config?: EngineConfig) {
    await Engine.configure(config);
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
  static async start(config?: SidequestConfig) {
    const engineConfig = await Engine.configure(config);

    const engine = Engine.start(engineConfig);
    const dashboard = SidequestDashboard.start({ ...config?.dashboard, backendConfig: engineConfig.backend });

    await engine;
    await dashboard;
  }

  /**
   * Builds a job class using a JobBuilder.
   *
   * @param JobClass The job class constructor.
   * @returns a JobBuilder that can be used to chain parameters and other job configurations.
   */
  static build<T extends JobClassType>(JobClass: T) {
    return this.job.build(JobClass);
  }
}
