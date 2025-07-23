import { JobData } from "../schema";

export class DuplicatedJobError extends Error {
  constructor(job: JobData) {
    super(
      `Job ${job.class} is duplicated, constructor args: ${JSON.stringify(job.constructor_args)} args: ${JSON.stringify(job.args)}`,
    );
  }
}
