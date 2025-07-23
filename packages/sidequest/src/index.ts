import { DashboardConfig, SidequestDashboard } from "@sidequest/dashboard";
import { Engine, JobClassType, SidequestConfig } from "@sidequest/engine";

export * from "@sidequest/engine";

export class Sidequest {
  static start(config?: SidequestConfig, dashboardConfig?: DashboardConfig) {
    const engine = Engine.start(config);

    SidequestDashboard.start(dashboardConfig);
    return engine;
  }

  static build(JobClass: JobClassType) {
    return Engine.build(JobClass);
  }
}
