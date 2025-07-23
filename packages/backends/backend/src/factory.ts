import { SQLBackend } from "./backend";
import { BackendConfig } from "./config";

interface BackendModule {
  default: new (...args: unknown[]) => SQLBackend;
}

export async function createBackendFromDriver(config: BackendConfig) {
  const mod = (await import(config.driver)) as BackendModule;
  const BackendClass = mod.default;
  return new BackendClass(config.config);
}
