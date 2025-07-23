import { logger } from "@sidequest/core";
import { Engine, Job, SidequestConfig } from "../engine";

export class ReleaseStaleJob extends Job {
  config: SidequestConfig;

  constructor(config: SidequestConfig) {
    super();
    this.config = config;
  }

  async run(): Promise<void> {
    if (!Engine.getConfig()) {
      await Engine.configure(this.config);
    }

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
