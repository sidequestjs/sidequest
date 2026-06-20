import { JobData, JobResult, logger, serializeAbortReason } from "@sidequest/core";
import { MessageChannel } from "node:worker_threads";
import Piscina from "piscina";
import { DEFAULT_RUNNER_PATH } from "../constants";
import { NonNullableEngineConfig } from "../engine";
import { JobRunner } from "./job-runner";

/**
 * A pool of worker threads for running jobs in parallel using Piscina.
 */
export class RunnerPool implements JobRunner {
  /** The underlying Piscina worker pool. */
  private readonly pool: Piscina;

  /**
   * Creates a new RunnerPool.
   * @param nonNullConfig The non-nullable engine configuration.
   */
  constructor(private nonNullConfig: NonNullableEngineConfig) {
    this.pool = new Piscina({
      filename: DEFAULT_RUNNER_PATH,
      minThreads: this.nonNullConfig.minThreads,
      maxThreads: this.nonNullConfig.maxThreads,
      idleTimeout: this.nonNullConfig.idleWorkerTimeout,
    });
    logger("RunnerPool").debug(
      `Created worker pool with min ${this.nonNullConfig.minThreads} threads and max ${this.nonNullConfig.maxThreads} threads`,
    );
  }

  /**
   * Runs a job in the worker pool.
   *
   * With `abortGracePeriodMs === 0` (default), an abort terminates the worker immediately. With a
   * positive grace period, the abort is delivered to the job cooperatively over a transferred port
   * (so it can stop via `this.abortSignal`), and the worker is only forcibly terminated if it has
   * not finished within the grace period.
   *
   * @param job The job data to run.
   * @param signal Optional abort signal for cancellation/timeout.
   * @returns A promise resolving to the job result.
   */
  run(job: JobData, signal?: AbortSignal): Promise<JobResult> {
    logger("RunnerPool").debug(`Running job ${job.id} in pool`);

    // Already aborted before we could start (e.g. canceled between claim and dispatch): don't run it.
    if (signal?.aborted) {
      return Promise.reject(signal.reason instanceof Error ? signal.reason : new Error("Job aborted before execution"));
    }

    const grace = this.nonNullConfig.abortGracePeriodMs;

    if (!signal || grace <= 0) {
      // Abort terminates the worker immediately.
      return this.pool.run({ jobData: job, config: this.nonNullConfig }, { signal });
    }

    // Deliver the abort cooperatively first, then hard-terminate after the grace period.
    const channel = new MessageChannel();
    const hardKill = new AbortController();
    let graceTimer: ReturnType<typeof setTimeout> | undefined;

    const onAbort = () => {
      channel.port1.postMessage(serializeAbortReason(signal.reason));
      graceTimer = setTimeout(() => hardKill.abort(), grace);
    };

    signal.addEventListener("abort", onAbort, { once: true });

    return this.pool
      .run(
        { jobData: job, config: this.nonNullConfig, abortPort: channel.port2 },
        { transferList: [channel.port2], signal: hardKill.signal },
      )
      .finally(() => {
        if (graceTimer) clearTimeout(graceTimer);
        signal.removeEventListener("abort", onAbort);
        channel.port1.close();
      });
  }

  /**
   * Destroys the worker pool and releases resources.
   */
  destroy(): void {
    logger("RunnerPool").debug("Destroying worker pool");
    void this.pool.destroy();
    logger("RunnerPool").debug("Worker pool destroyed");
  }
}
