import path from "path";

export const DEFAULT_WORKER_PATH = path.resolve(import.meta.dirname, "workers", "main.js");
export const DEFAULT_RUNNER_PATH = path.resolve(import.meta.dirname, "shared-runner", "runner.js");

/**
 * argv flag the engine passes when it forks the main worker. The worker module gates its
 * bootstrap on this flag instead of `!!process.send`, so it stays inert when merely imported
 * inside another forked process (e.g. a Vitest `pool: 'forks'` test worker).
 */
export const WORKER_PROCESS_FLAG = "--sidequest-worker";
