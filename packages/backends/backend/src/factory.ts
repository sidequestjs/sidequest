import { logger } from "@sidequest/core";
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
  logger("Backend").debug(`Creating backend from driver ${config.driver}`);
  const mod = (await import(config.driver)) as BackendModule;
  const BackendClass = mod.default;
  const backend = new BackendClass(config.config);
  logger("Backend").debug(`Backend driver created successfully`);
  return backend;
}
