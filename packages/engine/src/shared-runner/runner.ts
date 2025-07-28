import { JobData, JobResult, logger, toErrorData } from "@sidequest/core";
import { EngineConfig } from "../engine";
import { Job, JobClassType } from "../job/job";
import { importSidequest } from "../utils";

/**
 * Runs a job by dynamically importing its script and executing the specified class.
 * @param jobData The job data containing script and class information
 * @param config The non-nullable engine configuration.
 * @returns A promise resolving to the job result.
 */
export default async function run({ jobData, config }: { jobData: JobData; config: EngineConfig }): Promise<JobResult> {
  await injectSidequestConfig(config);

  let script: Record<string, JobClassType> = {};
  try {
    logger("Runner").debug(`Importing job script "${jobData.script}"`);
    script = (await import(jobData.script)) as Record<string, JobClassType>;
    logger("Runner").debug(`Successfully imported job script "${jobData.script}"`);
  } catch (error) {
    const errorMessage = `Failed to import job script "${jobData.script}": ${error instanceof Error ? error.message : String(error)}`;
    logger("Runner").error(errorMessage);
    const errorData = toErrorData(error as Error);
    return { __is_job_transition__: true, type: "failed", error: errorData };
  }

  const JobClass = script[jobData.class] ?? script.default;
  if (!JobClass || typeof JobClass !== "function") {
    const error = `Invalid job class: ${jobData.class}`;
    logger("Runner").error(error);
    const errorData = toErrorData(new Error(error));
    return { __is_job_transition__: true, type: "failed", error: errorData };
  }

  const job: Job = new JobClass(jobData.constructor_args);
  job.injectJobData(jobData);

  logger("Runner").debug(`Executing job class "${jobData.class}" with args:`, jobData.args);
  return job.perform(...jobData.args);
}

/**
 * Injects the provided Sidequest engine configuration into the job script.
 *
 * Dynamically imports the `Sidequest` module and applies the configuration,
 * ensuring migrations are skipped. Logs the process and handles errors gracefully,
 * allowing execution to proceed even if configuration injection fails.
 *
 * @param config - The engine configuration object to inject into Sidequest.
 * @returns A promise that resolves to `true` if the configuration was injected successfully,
 *          or `false` if an error occurred.
 */
export async function injectSidequestConfig(config: EngineConfig) {
  try {
    logger("Runner").debug("Injecting Sidequest config into job script");
    const sidequest = await importSidequest();
    await sidequest.Sidequest.configure({ ...config, skipMigration: true });
    logger("Runner").debug("Successfully injected Sidequest config");
    return true;
  } catch (error) {
    logger("Runner").warn(
      `Failed to inject Sidequest config: ${error instanceof Error ? error.message : String(error)}. Proceeding anyway.`,
    );
    return false;
  }
}
