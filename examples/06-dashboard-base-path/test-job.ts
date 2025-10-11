import { Job, logger } from "sidequest";

export class TestJob extends Job {
  async run() {
    logger().info(`Processing test job: ${this.id}`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return { message: "Job completed successfully" };
  }
}
