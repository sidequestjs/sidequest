import type { Backend } from "@sidequest/backend";

/** System/engine info surfaced in the dashboard sidebar. */
export interface SystemInfo {
  /** Sidequest version, when the server provides it. */
  version?: string;
  /** Backend driver name, when the server provides it. */
  driver?: string;
  /** Whether the backend is reachable. */
  connected: boolean;
}

/** Values the backend interface doesn't expose (driver, version), passed by the server. */
export interface SystemServiceOptions {
  version?: string;
  driver?: string;
}

/**
 * System/engine info for the dashboard: the backend driver and running version (supplied
 * by the server, since the backend interface doesn't expose them) plus a live
 * connectivity probe. Framework-neutral (no HTTP).
 */
export class SystemService {
  constructor(
    protected readonly backend: Backend,
    protected readonly options: SystemServiceOptions = {},
  ) {}

  /** Probes the backend for connectivity and reports the configured driver/version. */
  async info(): Promise<SystemInfo> {
    let connected = true;
    try {
      await this.backend.listQueues();
    } catch {
      connected = false;
    }
    return { version: this.options.version, driver: this.options.driver, connected };
  }
}
