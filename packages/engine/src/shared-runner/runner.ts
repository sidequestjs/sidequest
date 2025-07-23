import { JobData, JobResult, logger, toErrorData } from "@sidequest/core";
import { Job, JobClassType } from "../engine";

/**
 * Runs a job by dynamically importing its script and executing the specified class.
 * @param jobData The job data to execute.
 * @returns A promise resolving to the job result.
 */
export default async function run(jobData: JobData): Promise<JobResult> {
  let script: Record<string, JobClassType> = {};
  try {
    script = (await import(jobData.script)) as Record<string, JobClassType>;
  } catch (error) {
    const errorMessage = `Failed to import job script "${jobData.script}": ${error instanceof Error ? error.message : String(error)}`;
    logger().error(errorMessage);
    const errorData = toErrorData(error as Error);
    return { __is_job_transition__: true, type: "failed", error: errorData };
  }

  const JobClass = script[jobData.class] ?? script.default;
  if (!JobClass || typeof JobClass !== "function") {
    const error = `Invalid job class: ${jobData.class}`;
    logger().error(error);
    const errorData = toErrorData(new Error(error));
    return { __is_job_transition__: true, type: "failed", error: errorData };
  }

  const job: Job = new JobClass(jobData.constructor_args);
  return job.perform(...jobData.args);
}
