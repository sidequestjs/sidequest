import os from "os";
import path from "path";
import Piscina from "piscina";

import { JobData, JobResult } from "@sidequest/core";
import EventEmitter from "events";

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
  constructor(size: number = os.cpus().length) {
    this.pool = new Piscina({
      filename: runnerPath,
      minThreads: size,
      maxThreads: size * 2,
    });
  }

  /**
   * Runs a job in the worker pool.
   * @param job The job data to run.
   * @param signal Optional event emitter for cancellation.
   * @returns A promise resolving to the job result.
   */
  run(job: JobData, signal?: EventEmitter): Promise<JobResult> {
    return this.pool.run(job, { signal });
  }

  /**
   * Destroys the worker pool and releases resources.
   */
  async destroy(): Promise<void> {
    await this.pool.destroy();
  }
}
