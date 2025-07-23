/**
 * Configuration for a backend driver.
 */
export interface BackendConfig {
  /** The backend driver module name. */
  driver: string;
  /** Optional backend-specific configuration. */
  config?: unknown;
}
