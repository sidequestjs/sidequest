import { Backend } from "@sidequest/backend";
import { logger } from "@sidequest/core";

/**
 * Deletes finished jobs older than one month from the backend.
 * @param backend The backend instance to operate on.
 * @param cutoffMs The cutoff time in milliseconds.
 */
export async function cleanupFinishedJobs(backend: Backend, cutoffMs: number) {
  const cutoffDate = new Date(Date.now() - cutoffMs);
  logger("Engine").debug(`Deleting finished jobs older than ${cutoffDate.toISOString()}`);
  await backend?.deleteFinishedJobs(cutoffDate);
}
