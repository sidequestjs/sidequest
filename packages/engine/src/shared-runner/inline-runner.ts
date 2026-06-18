import { JobData, JobResult, logger } from "@sidequest/core";
import { NonNullableEngineConfig } from "../engine";
import { JobRunner } from "./job-runner";
import run from "./runner";

/**
 * Runs jobs in the current process/thread instead of a worker thread pool.
 *
 * Used by the inline execution mode (`runner: "inline"`). Unlike {@link RunnerPool}, a running job
 * cannot be forcibly aborted: cancellation and timeouts are best-effort only, and a CPU-bound job
 * will block the event loop. In exchange, jobs run in the host process and can reach live
 * in-process state (the basis for framework integrations like NestJS).
 */
export class InlineRunner implements JobRunner {
  /**
   * Creates a new InlineRunner.
   * @param nonNullConfig The non-nullable engine configuration.
   */
  constructor(private nonNullConfig: NonNullableEngineConfig) {}

  /**
   * Runs a job in the current process. The abort signal is intentionally not accepted: inline
   * execution has no separate thread to terminate.
   * @param job The job data to run.
   * @returns A promise resolving to the job result.
   */
  run(job: JobData): Promise<JobResult> {
    logger("InlineRunner").debug(`Running job ${job.id} inline`);
    return run({ jobData: job, config: this.nonNullConfig, inline: true });
  }

  /**
   * Releases resources. No-op for the inline runner.
   */
  destroy(): void {
    // There is no pool to tear down. In-flight jobs are awaited by the ExecutorManager.
  }
}
