import { DashboardConfig, SidequestDashboard } from "@sidequest/dashboard";
import { Engine, JobClassType, SidequestConfig } from "@sidequest/engine";

export * from "@sidequest/backend";
export * from "@sidequest/core";
export * from "@sidequest/engine";

export class Sidequest {
  static async start(config?: SidequestConfig, dashboardConfig?: Omit<DashboardConfig, "backendConfig">) {
    const engineConfig = await Engine.configure(config);
    const engine = Engine.start(engineConfig);

    await SidequestDashboard.start({ ...dashboardConfig, backendConfig: engineConfig.backend });

    return engine;
  }

  static build<T extends JobClassType>(JobClass: T) {
    return Engine.build(JobClass);
  }
}
