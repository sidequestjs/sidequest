import { Knex } from "knex";

/**
 * Configuration object for an SQL-based backend driver.
 */
export type SQLDriverConfig = Partial<Knex.Config>;

/**
 * Configuration for a backend driver.
 */
export interface BackendConfig {
  /** The backend driver module name. */
  driver: string;
  /** Optional backend-specific configuration. */
  config?: unknown;
}
