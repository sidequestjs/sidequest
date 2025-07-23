import { Backend } from "./backend";
import { BackendConfig } from "./config";

/**
 * Module type for a backend, exporting a default class.
 */
interface BackendModule {
  /** The backend class constructor. */
  default: new (...args: unknown[]) => Backend;
}

/**
 * Dynamically creates a backend instance from a driver name.
 * @param config The backend configuration.
 * @returns The backend instance.
 */
export async function createBackendFromDriver(config: BackendConfig) {
  const mod = (await import(config.driver)) as BackendModule;
  const BackendClass = mod.default;
  return new BackendClass(config.config);
}
