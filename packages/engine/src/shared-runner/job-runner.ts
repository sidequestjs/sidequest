import { JobData, JobResult } from "@sidequest/core";
import EventEmitter from "events";

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
   * @param signal Optional event emitter used to request cancellation/abort. May be ignored by
   * implementations that cannot forcibly abort a running job (e.g. the inline runner).
   */
  run(job: JobData, signal?: EventEmitter): Promise<JobResult>;

  /**
   * Releases any resources held by the runner.
   */
  destroy(): void;
}
