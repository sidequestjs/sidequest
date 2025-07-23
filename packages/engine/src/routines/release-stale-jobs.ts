import { logger } from "@sidequest/core";
import { Backend } from "@sidequest/backend";

export async function releaseStaleJobs(backend: Backend) {
  const staleJobs = await backend.staleJobs();

  if (staleJobs.length > 0) {
    logger().info(`Stale jobs found, making them available to process`);

    for (const jobData of staleJobs) {
      jobData.state = "waiting";
      await backend.updateJob(jobData);
    }
  }
}