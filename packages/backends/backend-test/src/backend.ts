import { SQLBackend } from "packages/backends/backend/dist";

export let backend: SQLBackend;

export function setTestBackend(newBackend: SQLBackend) {
  backend = newBackend;
}
