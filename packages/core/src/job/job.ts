import { access } from "fs/promises";
import path from "path";
import { pathToFileURL } from "url";
import { logger } from "../logger";
import { BackoffStrategy, ErrorData, JobData, JobState } from "../schema";
import { toErrorData } from "../tools";
import { parseStackTrace } from "../tools/stack-parser";
import { CompletedResult, FailedResult, isJobResult, JobResult, RetryResult, SnoozeResult } from "../transitions";
import { UniquenessConfig } from "../uniquiness";

/**
 * Type for a job class constructor.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type JobClassType = (new (...args: any) => Job) & { prototype: { run: (...args: any) => unknown } };

/**
 * Abstract base class for Sidequest jobs.
 * Concrete job classes should extend this class and implement the `run` method.
 *
 * There are a few convenience methods that can be used to return early and trigger a transition:
 * - `snooze(delay: number)`: Returns a SnoozeResult to delay the job execution for a specified time.
 * - `retry(reason: string | Error, delay?: number)`: Returns a RetryResult to retry the job with an optional delay.
 * - `fail(reason: string | Error)`: Returns a FailedResult to mark the job as failed with a reason.
 * - `complete(result: unknown)`: Returns a CompletedResult to mark the job as completed with a result.
 *
 * Calling any of these methods without returning its result will do absolutely nothing. Thus, you need to return
 * the result of any of these methods to trigger the job transition.
 *
 * If there is an uncaught error in the `run` method, it will automatically return a RetryResult with the error data.
 *
 *  @example
 * ```typescript
 * class MyJob extends Job {
 *   async run(arg1: string, arg2: number): Promise<string> {
 *     // Your job logic here
 *    if (someCondition) {
 *      return this.snooze(1000); // Delay the job for 1 second
 *    }
 *    if (anotherCondition) {
 *      return this.retry(new Error("Retrying due to some condition"), 500); // Retry after 500ms
 *    }
 *    if (yetAnotherCondition) {
 *     return this.fail("Failed due to some reason"); // Mark the job as failed
 *    }
 *    // If everything is fine, return the result
 *    return this.complete("Job completed successfully"); // Mark the job as completed
 *    // Alternatively, you can just return a value, which will be treated as the job result:
 *    return "Job completed successfully";
 *   }
 * }
 */
export abstract class Job implements JobData {
  private scriptResolver: Promise<string>;

  // JobData properties
  readonly id!: number;
  readonly script!: string;
  readonly queue!: string;
  readonly state!: JobState;
  readonly class!: string;
  readonly args!: unknown[];
  readonly constructor_args!: unknown[];
  readonly attempt!: number;
  readonly max_attempts!: number;
  readonly inserted_at!: Date;
  readonly available_at!: Date;
  readonly timeout!: number | null;
  readonly result!: Omit<unknown, "undefined"> | null;
  readonly errors!: ErrorData[] | null;
  readonly attempted_at!: Date | null;
  readonly completed_at!: Date | null;
  readonly failed_at!: Date | null;
  readonly canceled_at!: Date | null;
  readonly claimed_at!: Date | null;
  readonly claimed_by!: string | null;
  readonly unique_digest!: string | null;
  readonly uniqueness_config!: UniquenessConfig | null;
  readonly backoff_strategy!: BackoffStrategy;
  readonly retry_delay!: number | null;

  /**
   * Initializes the job and resolves its script path.
   */
  constructor() {
    /* IMPORTANT: the build path resolution must be called here.
     * This is important to ensure the path resolution is returning the Job implementation.
     */
    this.scriptResolver = buildPath(this.constructor.name).then((script) => {
      Object.assign(this, { script });
      logger("Job").debug(`Job script resolved: ${script}`);
      return script;
    });
  }

  /**
   * Injects JobData properties into the job instance at runtime.
   * @param jobData The job data to inject into this instance.
   */
  injectJobData(jobData: JobData): void {
    logger("Job").debug(`Injecting job data into ${this.className}:`, jobData);
    Object.assign(this, jobData);
  }

  /**
   * The class name of this job.
   */
  get className() {
    return this.constructor.name;
  }

  /**
   * Waits until the job is ready (script path resolved).
   * @returns A promise that resolves when ready.
   */
  async ready() {
    return await this.scriptResolver;
  }

  /**
   * Returns a snooze result for this job.
   * This will delay the job execution for the specified time by setting `available_at` to the current
   * time plus the delay.
   *
   * @param delay The delay in milliseconds.
   * @returns A SnoozeResult object.
   */
  snooze(delay: number): SnoozeResult {
    logger("Job").debug(`Job ${this.className} snoozed for ${delay}ms`);
    return { __is_job_transition__: true, type: "snooze", delay: delay };
  }

  /**
   * Returns a retry result for this job. It will increase one attempt and set the `attempted_at`
   * to the current time. If the number of attempts is increased to the maximum allowed, the transition
   * will mark the job as failed.
   *
   * @param reason The reason for retrying.
   * @param delay Optional delay in milliseconds.
   * @returns A RetryResult object.
   */
  retry(reason: string | Error, delay?: number): RetryResult {
    const error = toErrorData(reason);
    logger("Job").debug(`Job ${this.className} retrying due to: ${error.message}${delay ? ` after ${delay}ms` : ""}`);
    return { __is_job_transition__: true, type: "retry", error, delay };
  }

  /**
   * Returns a failed result for this job. This method will prevent any retry attempts and will mark the
   * job as failed indefinitely.
   *
   * @param reason The reason for failure.
   * @returns A FailedResult object.
   */
  fail(reason: string | Error): FailedResult {
    const error = toErrorData(reason);
    logger("Job").debug(`Job ${this.className} failed: ${error.message}`);
    return { __is_job_transition__: true, type: "failed", error };
  }

  /**
   * Returns a completed result for this job.
   * This method will mark the job as completed.
   *
   * @param result The result value.
   * @returns A CompletedResult object.
   */
  complete(result: unknown): CompletedResult {
    logger("Job").debug(`Job ${this.className} completed.`);
    return { __is_job_transition__: true, type: "completed", result };
  }

  /**
   * Runs the job and returns a JobResult.
   * This method is intended to be used internally.
   *
   * @param args Arguments to pass to the run method.
   * @returns A promise resolving to the job result.
   */
  async perform<T extends JobClassType>(...args: Parameters<T["prototype"]["run"]>): Promise<JobResult> {
    try {
      const result = await this.run(...args);
      if (isJobResult(result)) {
        return result;
      }
      return { __is_job_transition__: true, type: "completed", result };
    } catch (error) {
      logger("Job").debug(error);
      const errorData = toErrorData(error as Error);
      return { __is_job_transition__: true, type: "retry", error: errorData };
    }
  }

  /**
   * The main logic for the job. Must be implemented by subclasses.
   *
   * Returning anything from this method will be treated as the job result and mark the job for completion.
   *
   * If there is an uncaught error in the `run` method, it will automatically return a RetryResult with
   * the error data, which will trigger a job retry.
   *
   * There are a few convenience methods that can be used inside this method to return early and trigger
   * a job transition:
   * - `snooze(delay: number)`: Returns a SnoozeResult to delay the job execution for a specified time.
   * - `retry(reason: string | Error, delay?: number)`: Returns a RetryResult to retry the job with an
   * optional delay.
   * - `fail(reason: string | Error)`: Returns a FailedResult to mark the job as failed with a reason.
   * - `complete(result: unknown)`: Returns a CompletedResult to mark the job as completed with a result.
   *
   * You must return the result of any of these convenience methods to trigger the job transition. Simply
   * calling them without returning their result will do absolutely nothing.
   *
   * @example
   * ```typescript
   * async run(arg1: string, arg2: number): Promise<string> {
   *  // Your job logic here
   *  if (someCondition) {
   *    return this.snooze(1000); // Delay the job for 1 second
   *  }
   *  if (anotherCondition) {
   *    return this.retry(new Error("Retrying due to some condition"), 500); // Retry after 500ms
   *  }
   *  if (yetAnotherCondition) {
   *   return this.fail("Failed due to some reason"); // Mark the job as failed
   *  }
   *  // If everything is fine, return the result
   *  return this.complete("Job completed successfully"); // Mark the job as completed
   *  // Alternatively, you can just return a value, which will be treated as the job result:
   *  return "Job completed successfully";
   * }
   * ```
   *
   * @param args Arguments for the job, if any.
   * @returns The result of the job.
   */
  abstract run(...args: unknown[]): unknown;
}

// TODO need to test this with unit tests
/**
 * Attempts to determine the file path where a given class is exported by analyzing the current call stack.
 *
 * This function inspects the stack trace of a newly created error to extract file paths,
 * then checks each file to see if it exports the specified class. If found, returns the relative path
 * from the current working directory. If not found, returns the first file path in the stack as a fallback.
 * Throws an error if no file paths can be determined.
 *
 * @param className - The name of the class to search for in the stack trace files.
 * @returns A promise that resolves to the relative path of the file exporting the class, or the first file in the stack.
 * @throws If no file paths can be determined from the stack trace.
 */
async function buildPath(className: string) {
  const err = new Error();
  logger("Job").debug(`Resolving script file path. Stack lines: ${err.stack}`);
  const filePaths = parseStackTrace(err);

  for (const filePath of filePaths) {
    const hasExported = await hasClassExported(filePath, className);
    if (hasExported) {
      const relativePath = path.relative(import.meta.dirname, filePath);
      logger("Job").debug(`${filePath} exports class ${className}, relative path: ${relativePath}`);
      return relativePath.replaceAll("\\", "/");
    }
  }

  if (filePaths.length > 0) {
    const relativePath = path.relative(import.meta.dirname, filePaths[0]);
    logger("Job").debug(`No class ${className} found in stack, returning first file path: ${relativePath}`);
    return relativePath.replaceAll("\\", "/");
  }

  throw new Error("Could not determine the task path");
}

/**
 * Resolves a relative script path (as stored in job.script) to an absolute file URL
 * that can be used for dynamic imports.
 *
 * This function takes a relative path that was generated by buildPath() and converts
 * it back to an absolute file URL by resolving it relative to this file's directory.
 * It also handles edge cases where the path might already be absolute or a file URL.
 *
 * @param relativePath - The relative path stored in job.script
 * @returns The absolute file URL that can be used for dynamic import()
 *
 * @example
 * ```typescript
 * const scriptUrl = resolveScriptPathForJob("../../../examples/hello-job.js");
 * const module = await import(scriptUrl);
 * ```
 */
export function resolveScriptPathForJob(relativePath: string): string {
  // If it's already a file URL, return as-is
  if (relativePath.startsWith("file://")) {
    return relativePath;
  }

  // If it's already an absolute path, convert to file URL
  if (path.isAbsolute(relativePath)) {
    return pathToFileURL(relativePath).href;
  }

  // Otherwise, resolve relative to this file's directory
  const absolutePath = path.resolve(import.meta.dirname, relativePath);
  return pathToFileURL(absolutePath).href;
}

/**
 * Checks if a given file exports a class with the specified name.
 *
 * This function attempts to import the module at the provided file path and
 * determines if it exports a class (either as a named export or as the default export)
 * matching the given class name.
 *
 * @param filePath - The absolute path to the module file to check.
 * @param className - The name of the class to look for in the module's exports.
 * @returns A promise that resolves to `true` if the class is exported, or `false` otherwise.
 */
async function hasClassExported(filePath: string, className: string): Promise<boolean> {
  try {
    await access(filePath);
  } catch {
    return false;
  }

  try {
    const moduleUrl = pathToFileURL(filePath).href;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const mod: Record<string, unknown> = await import(moduleUrl);

    if (mod && typeof mod === "object" && className in mod && typeof mod[className] === "function") {
      return true;
    }

    if ("default" in mod && typeof mod.default === "function" && mod.default.name === className) {
      return true;
    }

    return false;
  } catch (e) {
    logger("Core").debug(e);
    return false;
  }
}
