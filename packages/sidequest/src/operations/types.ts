import { SQLDriverConfig } from "@sidequest/backend";
import { EngineConfig } from "@sidequest/engine";

/**
 * Known backend driver identifiers
 */
export type KnownSQLDrivers = "@sidequest/postgres-backend" | "@sidequest/mysql-backend" | "@sidequest/sqlite-backend";

/**
 * Known MongoDB driver identifier
 */
export type KnownMongoDriver = "@sidequest/mongo-backend";

/**
 * All known backend driver identifiers
 */
export type KnownDrivers = KnownSQLDrivers | KnownMongoDriver;

/**
 * Strongly typed backend configuration that automatically infers config type based on driver
 */
export type StronglyTypedBackendConfig<TDriver extends string = KnownDrivers> = TDriver extends KnownSQLDrivers
  ? {
      /** SQL backend driver identifier */
      driver: TDriver;
      /** Database configuration - can be a connection string or detailed config object */
      config: string | SQLDriverConfig;
    }
  : TDriver extends KnownMongoDriver
    ? {
        /** MongoDB backend driver identifier */
        driver: TDriver;
        /** MongoDB connection string */
        config: string;
      }
    : {
        /** Custom backend driver identifier */
        driver: TDriver;
        /** Custom configuration - type is unknown for flexibility */
        config: unknown;
      };

/**
 * Sidequest engine configuration with strongly typed backend
 */
export type SidequestEngineConfig<TDriver extends string = KnownDrivers> = Omit<EngineConfig, "backend"> & {
  /** Backend configuration with driver-specific typing */
  backend: StronglyTypedBackendConfig<TDriver>;
};

/**
 * Options for the optional dashboard served alongside the engine by `@sidequest/web`.
 * Leaving `auth` unset serves the dashboard wide open (dev-only).
 */
export interface DashboardConfig {
  /** Boot the dashboard when the engine starts. @default false */
  enabled?: boolean;
  /** Listen port. @default 8678 */
  port?: number;
  /** Reverse-proxy prefix the dashboard is mounted under, e.g. "/admin". @default "" */
  basePath?: string;
  /** Basic-auth credentials. Omit for a wide-open (dev-only) dashboard. */
  auth?: { user: string; password: string };
}

/**
 * Complete Sidequest configuration: the engine config plus the optional `dashboard`
 * served by the `@sidequest/web` façade.
 */
export type SidequestConfig<TDriver extends string = KnownDrivers> = SidequestEngineConfig<TDriver> & {
  /** Optional dashboard served alongside the engine. Requires `@sidequest/web`. */
  dashboard?: DashboardConfig;
};
