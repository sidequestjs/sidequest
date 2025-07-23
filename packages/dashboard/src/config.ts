import { BackendConfig } from "@sidequest/backend";

export interface DashboardConfig {
  backendConfig?: BackendConfig;
  enabled?: boolean;
  port?: number;
  auth?: {
    user: string;
    password: string;
  };
}
