import { DashboardConfig, SidequestDashboard } from "@sidequest/dashboard";
import { Engine, JobClassType, SidequestConfig } from "@sidequest/engine";

export * from "@sidequest/backend";
export * from "@sidequest/core";
export * from "@sidequest/engine";

/**
 * Main entry point for the Sidequest job queue system.
 */
export class Sidequest {
  /**
   * Starts the Sidequest engine and dashboard.
   * @param config Optional Sidequest engine configuration.
   * @param dashboardConfig Optional dashboard configuration (without backendConfig - it will use the same config as the Sidequest config).
   * @returns The started engine instance.
   */
  static async start(config?: SidequestConfig, dashboardConfig?: Omit<DashboardConfig, "backendConfig">) {
    const engineConfig = await Engine.configure(config);
    const engine = Engine.start(engineConfig);

    await SidequestDashboard.start({ ...dashboardConfig, backendConfig: engineConfig.backend });

    return engine;
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
