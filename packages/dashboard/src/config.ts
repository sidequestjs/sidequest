export interface DashboardConfig {
  enabled: boolean;
  port?: number;
  auth?: {
    user: string;
    password: string;
  };
}
