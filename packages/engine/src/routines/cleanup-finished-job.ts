import { Backend } from "@sidequest/backend";

const oneMonth = 30 * 24 * 60 * 60 * 1000;

/**
 * Deletes finished jobs older than one month from the backend.
 * @param backend The backend instance to operate on.
 */
export async function cleanupFinishedJobs(backend: Backend) {
  const cutoffDate = new Date(Date.now() - oneMonth);
  await backend?.deleteFinishedJobs(cutoffDate);
}
