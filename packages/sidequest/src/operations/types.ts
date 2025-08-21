import { SQLDriverConfig } from "@sidequest/backend";
import { DashboardConfig } from "@sidequest/dashboard";
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
 * Complete Sidequest configuration
 */
export type SidequestConfig<TDriver extends string = KnownDrivers> = SidequestEngineConfig<TDriver> & {
  /** Optional dashboard configuration */
  dashboard?: Omit<DashboardConfig, "backendConfig">;
};
