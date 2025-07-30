import { JobData, JobResult, logger } from "@sidequest/core";
import EventEmitter from "events";
import path from "path";
import Piscina from "piscina";
import { NonNullableEngineConfig } from "../engine";

const runnerPath = path.resolve(import.meta.dirname, "runner.js");

/**
 * A pool of worker threads for running jobs in parallel using Piscina.
 */
export class RunnerPool {
  /** The underlying Piscina worker pool. */
  private readonly pool: Piscina;

  /**
   * Creates a new RunnerPool.
   * @param nonNullConfig The non-nullable engine configuration.
   */
  constructor(private nonNullConfig: NonNullableEngineConfig) {
    this.pool = new Piscina({
      filename: runnerPath,
      minThreads: this.nonNullConfig.minThreads,
      maxThreads: this.nonNullConfig.maxThreads,
      idleTimeout: 10_000,
    });
    logger("RunnerPool").debug(
      `Created worker pool with min ${this.nonNullConfig.minThreads} threads and max ${this.nonNullConfig.maxThreads} threads`,
    );
  }

  /**
   * Runs a job in the worker pool.
   * @param job The job data to run.
   * @param signal Optional event emitter for cancellation.
   * @returns A promise resolving to the job result.
   */
  run(job: JobData, signal?: EventEmitter): Promise<JobResult> {
    logger("RunnerPool").debug(`Running job ${job.id} in pool`);
    return this.pool.run({ jobData: job, config: this.nonNullConfig }, { signal });
  }

  /**
   * Destroys the worker pool and releases resources.
   */
  async destroy(): Promise<void> {
    logger("RunnerPool").debug("Destroying worker pool");
    await this.pool.destroy();
  }
}
