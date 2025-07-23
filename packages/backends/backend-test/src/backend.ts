import { Backend } from "@sidequest/backend";

export let backend: Backend;

export function setTestBackend(newBackend: Backend) {
  backend = newBackend;
}
