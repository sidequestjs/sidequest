import { Backend } from "@sidequest/backend";
import { logger } from "@sidequest/core";

/**
 * Finds and releases stale jobs, making them available for processing again.
 * @param backend The backend instance to operate on.
 */
export async function releaseStaleJobs(backend: Backend) {
  const staleJobs = await backend.staleJobs();

  if (staleJobs.length > 0) {
    logger("Engine").info(`Stale jobs found, making them available to process`);

    for (const jobData of staleJobs) {
      jobData.state = "waiting";
      await backend.updateJob(jobData);
    }
  } else {
    logger("Engine").info(`No stale jobs found`);
  }
}
