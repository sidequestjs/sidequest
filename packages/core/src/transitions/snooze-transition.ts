import { logger } from "../logger";
import { JobData } from "../schema";
import { JobTransition } from "./transition";

export class SnoozeTransition extends JobTransition {
  delay: number;

  constructor(delay: number) {
    super();
    this.delay = delay;
  }

  apply(job: JobData): JobData {
    logger().info(`Job ${job.class} snoozed by ${this.delay}ms`);
    job.state = "waiting";
    if (job.attempt > 0) {
      job.attempt -= 1;
    }
    job.available_at = new Date(Date.now() + this.delay);
    return job;
  }
}
