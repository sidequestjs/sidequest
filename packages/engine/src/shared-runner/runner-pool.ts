import { JobData, JobResult, logger } from "@sidequest/core";
import EventEmitter from "events";
import path from "path";
import Piscina from "piscina";

const runnerPath = path.resolve(import.meta.dirname, "runner.js");

/**
 * A pool of worker threads for running jobs in parallel using Piscina.
 */
export class RunnerPool {
  /** The underlying Piscina worker pool. */
  private readonly pool: Piscina;

  /**
   * Creates a new RunnerPool.
   * @param size The number of worker threads to use (defaults to number of CPUs).
   */
  constructor(minThreads: number, maxThreads: number) {
    this.pool = new Piscina({
      filename: runnerPath,
      minThreads,
      maxThreads,
    });
    logger("RunnerPool").debug(`Created worker pool with min ${minThreads} threads and max ${maxThreads} threads`);
  }

  /**
   * Runs a job in the worker pool.
   * @param job The job data to run.
   * @param signal Optional event emitter for cancellation.
   * @returns A promise resolving to the job result.
   */
  run(job: JobData, signal?: EventEmitter): Promise<JobResult> {
    logger("RunnerPool").debug(`Running job ${job.id} in pool`);
    return this.pool.run(job, { signal });
  }

  /**
   * Destroys the worker pool and releases resources.
   */
  async destroy(): Promise<void> {
    logger("RunnerPool").debug("Destroying worker pool");
    await this.pool.destroy();
  }
}
