import os from "os";
import path from "path";
import Piscina from "piscina";

import { JobData, JobResult } from "@sidequest/core";

const runnerPath = path.resolve(import.meta.dirname, "runner.js");
export class RunnerPool {
  private readonly pool: Piscina;

  constructor(size: number = os.cpus().length) {
    this.pool = new Piscina({
      filename: runnerPath,
      minThreads: size,
      maxThreads: size * 2,
    });
  }

  run(job: JobData): Promise<JobResult> {
    return this.pool.run(job);
  }

  async destroy(): Promise<void> {
    await this.pool.destroy();
  }
}
