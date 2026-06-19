import { JobData, JobResult } from "@sidequest/core";

/**
 * Abstraction over how a claimed job is actually executed.
 *
 * Implemented by the thread-based {@link RunnerPool} (piscina worker pool) and the
 * {@link InlineRunner} (same-process execution). The {@link ExecutorManager} picks one based on
 * the engine's `runner` configuration.
 */
export interface JobRunner {
  /**
   * Runs a job and resolves with its result.
   * @param job The job data to run.
   * @param signal Abort signal for the run. The thread runner uses it to terminate the worker; the
   * inline runner forwards it to the job so it can stop cooperatively.
   */
  run(job: JobData, signal?: AbortSignal): Promise<JobResult>;

  /**
   * Releases any resources held by the runner.
   */
  destroy(): void;
}
