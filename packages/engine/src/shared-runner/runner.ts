import { Job, JobClassType, JobData, JobResult, logger, resolveScriptPathForJob, toErrorData } from "@sidequest/core";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { EngineConfig } from "../engine";
import { importSidequest } from "../utils";
import { findSidequestJobsScriptInParentDirs, MANUAL_SCRIPT_TAG, resolveScriptPath } from "./manual-loader";

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

    let scriptUrl: string;
    if (jobData.script === MANUAL_SCRIPT_TAG) {
      logger("Runner").debug("Manual job resolution is enabled; importing 'sidequest.jobs.js' job script.");
      try {
        // When manual job resolution is enabled, import from the sidequest.jobs.js script
        if (!config.jobsFilePath) {
          // If no custom path is provided, search for sidequest.jobs.js in parent directories
          // throws if not found
          scriptUrl = findSidequestJobsScriptInParentDirs();
        } else {
          // If a custom path is provided, resolve it and ensure it exists
          scriptUrl = resolveScriptPath(config.jobsFilePath);
          if (!existsSync(fileURLToPath(scriptUrl))) {
            throw new Error(`The specified jobsFilePath does not exist. Resolved to: ${scriptUrl}`);
          }
        }
      } catch (error) {
        const errorMessage = `Failed to locate 'sidequest.jobs.js' for manual job resolution: ${error instanceof Error ? error.message : String(error)}`;
        logger("Runner").error(errorMessage);
        const errorData = toErrorData(error as Error);
        return { __is_job_transition__: true, type: "failed", error: errorData };
      }
    } else {
      logger("Runner").debug("Manual job resolution is disabled; importing specified job script.");
      // Convert relative path to absolute file URL for dynamic import
      scriptUrl = resolveScriptPathForJob(jobData.script);
    }

    script = (await import(scriptUrl)) as Record<string, JobClassType>;
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

  const job: Job = new JobClass(...jobData.constructor_args);
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
    const { Sidequest } = await importSidequest();
    await Sidequest.configure({ ...config, skipMigration: true });
    logger("Runner").debug("Successfully injected Sidequest config");
    return true;
  } catch (error) {
    logger("Runner").warn(
      `Failed to inject Sidequest config: ${error instanceof Error ? error.message : String(error)}. Proceeding anyway.`,
    );
    return false;
  }
}
