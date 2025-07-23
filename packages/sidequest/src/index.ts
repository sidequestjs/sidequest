import { DashboardConfig, SidequestDashboard } from "@sidequest/dashboard";
import { Engine, JobClassType, SidequestConfig } from "@sidequest/engine";

export * from "@sidequest/backend";
export * from "@sidequest/core";
export * from "@sidequest/engine";

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
  static async configure(config?: SidequestConfig) {
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
  static async start(config?: SidequestConfig & { dashboard?: Omit<DashboardConfig, "backendConfig"> }) {
    const engineConfig = await Engine.configure(config);

    const engine = Engine.start(engineConfig);
    const dashboard = SidequestDashboard.start({ ...config?.dashboard, backendConfig: engineConfig.backend });

    await engine;
    await dashboard;
  }

  /**
   * Builds a job class using the Sidequest engine.
   *
   * @param JobClass The job class constructor.
   * @returns a JobBuilder that can be used to chain parameters and other job configurations.
   */
  static build<T extends JobClassType>(JobClass: T) {
    return Engine.build(JobClass);
  }
}
