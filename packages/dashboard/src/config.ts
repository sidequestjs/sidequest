import { BackendConfig } from "@sidequest/backend";
import { Server } from "node:http";

/**
 * Configuration for the Dashboard module.
 *
 * Provides options to control backend integration, network settings, authentication,
 * routing and optional HTTP server mounting for the dashboard server.
 *
 * @remarks
 * All fields are optional to allow minimal configuration; callers should apply sensible
 * defaults where appropriate.
 */
export interface DashboardConfig {
  /**
   * Configuration for the backend used by the dashboard.
   */
  backendConfig?: BackendConfig;
  /**
   * Whether the dashboard server is enabled.
   */
  enabled?: boolean;
  /**
   * Port for the dashboard server to listen on.
   */
  port?: number;
  /**
   * Optional basic authentication configuration.
   * If provided, the dashboard will require HTTP basic authentication.
   */
  auth?: {
    user: string;
    password: string;
  };
  /**
   * Optional custom route for this instance.
   * Only applicable if `server` is provided.
   */
  customRoute?: string;
  /**
   * Optional Node.js HTTP Server to mount the dashboard onto.
   * If provided, the dashboard will be mounted onto this server instead of starting its own.
   * When using this option, the `port` setting is ignored.
   * This works with any web framework (Express, Fastify, Koa, etc.) as long as they
   * expose their underlying HTTP server.
   */
  server?: Server;
}
