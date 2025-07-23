import { logger } from "../logger";
import { JobData } from "../schema";
import { ErrorData } from "../schema/error-data";
import { serializeError } from "../tools";
import { JobTransition } from "./transition";

export class FailTransition extends JobTransition {
  reason: Error | string;

  constructor(reason: Error | string) {
    super();
    this.reason = reason;
  }

  apply(job: JobData): JobData {
    logger().error(this.reason);
    const error = this.reason instanceof Error ? serializeError(this.reason) : ({ message: this.reason } as ErrorData);
    job.errors ??= [];
    const errData = {
      ...error,
      attempt: job.attempt,
      attempted_at: job.attempted_at,
      attempt_by: job.claimed_by,
    };
    job.errors.push(errData);
    job.state = "failed";
    job.failed_at = new Date();
    return job;
  }
}
