import { BackendConfig } from "@sidequest/backend";

/**
 * Configuration interface for the Sidequest dashboard.
 *
 * Defines the available options for configuring the dashboard including
 * backend connectivity, server settings, authentication, and routing.
 *
 * @interface DashboardConfig
 * @example
 * ```typescript
 * const config: DashboardConfig = {
 *   enabled: true,
 *   port: 3000,
 *   basePath: "/admin/sidequest",
 *   auth: {
 *     user: "admin",
 *     password: "secure-password"
 *   }
 * };
 * ```
 */
export interface DashboardConfig {
  /**
   * Configuration for connecting to the Sidequest backend.
   * This includes the driver and any necessary connection options.
   */
  backendConfig?: BackendConfig;
  /**
   * Indicates whether the dashboard is enabled.
   * If set to false, the dashboard server will not start.
   *
   * @default false
   */
  enabled?: boolean;
  /**
   * Port number on which the dashboard server will listen for incoming requests.
   *
   * @default 8678
   */
  port?: number;
  /**
   * Base path for the dashboard when served behind a reverse proxy.
   * For example, if you want to serve the dashboard at `/admin/sidequest`,
   * set this to `/admin/sidequest`.
   *
   * @example "/admin/sidequest"
   * @default ""
   */
  basePath?: string;
  /**
   * Optional basic authentication configuration.
   * If provided, the dashboard will require users to authenticate
   * using the specified username and password.
   *
   * @example
   * ```typescript
   * auth: {
   *   user: 'admin',
   *   password: 'secure-password'
   * }
   * ```
   * @default undefined
   */
  auth?: {
    user: string;
    password: string;
  };
}
