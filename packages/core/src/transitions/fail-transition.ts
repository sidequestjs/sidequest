import { logger } from "../logger";
import { JobData } from "../schema";
import { ErrorData } from "../schema/error-data";
import { toErrorData } from "../tools/parse-error-data";
import { JobTransition } from "./transition";

export class FailTransition extends JobTransition {
  reason: ErrorData | Error | string;

  constructor(reason: ErrorData | Error | string) {
    super();
    this.reason = reason;
  }

  apply(job: JobData): JobData {
    logger().error(this.reason);
    const error = toErrorData(this.reason);
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
