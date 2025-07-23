import { BackendConfig, createBackendFromDriver, SQLBackend } from "@sidequest/backend";

let backend: SQLBackend;

export async function initBackend(config: BackendConfig) {
  backend = await createBackendFromDriver(config);
}

export function getBackend() {
  if (!backend) {
    throw new Error("Backend not initialized!");
  }
  return backend;
}
