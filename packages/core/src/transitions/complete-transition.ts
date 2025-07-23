import { logger } from "../logger";
import { JobData } from "../schema";
import { JobTransition } from "./transition";

export class CompleteTransition extends JobTransition {
  result?: unknown;

  constructor(result?: unknown) {
    super();
    this.result = result;
  }

  apply(job: JobData): JobData {
    logger().info(`Job ${job.class} has completed with args: ${JSON.stringify(job.args)}`);
    job.completed_at = new Date();
    job.state = "completed";
    job.result = this.result ?? null;
    return job;
  }
}
