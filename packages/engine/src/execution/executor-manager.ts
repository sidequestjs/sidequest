import { Backend } from "@sidequest/backend";
import { JobData, JobTransitionFactory, logger, QueueConfig, RunningTransition } from "@sidequest/core";
import EventEmitter from "events";
import { SidequestConfig } from "../engine";
import { JobTransitioner } from "../job/job-transitioner";
import { RunnerPool } from "../shared-runner";

export class ExecutorManager {
  private activeByQueue: Record<string, Set<number>>;
  private activeJobs: Set<number>;
  private sidequestConfig: SidequestConfig;
  private backend: Backend;
  private runnerPool: RunnerPool;

  constructor(sidequestConfig: SidequestConfig, backend: Backend) {
    this.activeByQueue = {};
    this.activeJobs = new Set();
    this.sidequestConfig = sidequestConfig;
    this.backend = backend;
    this.runnerPool = new RunnerPool();
  }

  availableSlotsByQueue(queueConfig: QueueConfig) {
    if (!this.activeByQueue[queueConfig.name]) {
      this.activeByQueue[queueConfig.name] = new Set();
    }
    const activeJobs = this.activeByQueue[queueConfig.name];
    const limit = queueConfig.concurrency ?? 10;

    const availableSlots = limit - activeJobs.size;
    if (availableSlots < 0) {
      return 0;
    }
    return availableSlots;
  }

  availableSlotsGlobal() {
    const limit = this.sidequestConfig.maxConcurrentJobs ?? 10;
    const availableSlots = limit - this.activeJobs.size;
    if (availableSlots < 0) {
      return 0;
    }
    return availableSlots;
  }

  totalActiveWorkers() {
    return this.activeJobs.size;
  }

  async execute(queueConfig: QueueConfig, job: JobData): Promise<void> {
    if (!this.activeByQueue[queueConfig.name]) {
      this.activeByQueue[queueConfig.name] = new Set();
    }

    // TODO: add availabilith check
    this.activeByQueue[queueConfig.name].add(job.id);
    this.activeJobs.add(job.id);

    job = await JobTransitioner.apply(job, new RunningTransition());

    const signal = new EventEmitter();

    let isRunning = true;

    const jobChecker = async () => {
      while (isRunning) {
        const watchedJob = await this.backend.getJob(job.id);
        if (watchedJob.state === "canceled") {
          signal.emit("abort");
          isRunning = false;
        }
        await new Promise((r) => setTimeout(r, 1000));
      }
    };
    void jobChecker();

    try {
      const result = await this.runnerPool.run(job, signal);
      isRunning = false;
      const transition = JobTransitionFactory.create(result);

      await JobTransitioner.apply(job, transition);

      this.activeByQueue[queueConfig.name].delete(job.id);
      this.activeJobs.delete(job.id);
    } catch (error: unknown) {
      isRunning = false;
      const err = error as Error;
      if (err.message === "The task has been aborted") {
        logger().debug(`Job ${job.id} was canceled`);
      } else {
        throw error;
      }
    }
  }
}
