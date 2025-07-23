import { Backend } from "@sidequest/backend";

const oneMonth = 30 * 24 * 60 * 60 * 1000;

export async function cleanupFinishedJobs(backend: Backend) {
  const cutoffDate = new Date(Date.now() - oneMonth);
  await backend?.deleteFinishedJobs(cutoffDate);
}
