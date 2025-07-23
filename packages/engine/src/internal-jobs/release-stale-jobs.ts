import { logger } from "@sidequest/core";
import { Engine, Job } from "../engine";

export class ReleaseStaleJob extends Job {
  async run(): Promise<void> {
    const backend = Engine.getBackend();
    const staleJobs = await backend!.staleJobs();

    if (staleJobs.length > 0) {
      logger().info(`Stale jobs found, making it available to process`);

      for (const jobData of staleJobs) {
        jobData.state = "waiting";
        await backend!.updateJob(jobData);
      }
    }
  }
}
