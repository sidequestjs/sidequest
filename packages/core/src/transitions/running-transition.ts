import { logger } from "../logger";
import { JobData } from "../schema";
import { JobTransition } from "./transition";

export class RunningTransition extends JobTransition {
  apply(job: JobData): JobData {
    logger().info(`Running job ${job.class} with args: ${JSON.stringify(job.args)}`);
    job.state = "running";
    job.attempted_at = new Date();
    job.attempt = job.attempt + 1;
    return job;
  }
}
