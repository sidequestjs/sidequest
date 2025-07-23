import { Backend, BackendConfig, createBackendFromDriver } from "@sidequest/backend";

let backend: Backend;

export async function initBackend(config: BackendConfig) {
  backend = await createBackendFromDriver(config);
}

export function getBackend() {
  if (!backend) {
    throw new Error("Backend not initialized!");
  }
  return backend;
}
