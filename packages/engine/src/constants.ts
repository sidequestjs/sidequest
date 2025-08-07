import path from "path";

export const DEFAULT_WORKER_PATH = path.resolve(import.meta.dirname, "workers", "main.js");
export const DEFAULT_RUNNER_PATH = path.resolve(import.meta.dirname, "shared-runner", "runner.js");
