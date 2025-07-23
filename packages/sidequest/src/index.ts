import { Engine, SidequestConfig } from "@sidequest/engine";
import { SidequestDashboard, DashboardConfig } from "@sidequest/dashboard";

export * from "@sidequest/engine";

export class Sidequest {
  static start(config: SidequestConfig, dashboardConfig?: DashboardConfig){
    const engine = Engine.start(config);

    SidequestDashboard.start(dashboardConfig);
    return engine;
  }
}