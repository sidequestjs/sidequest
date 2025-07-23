import { JobData, JobTransitionFactory, QueueConfig, RunningTransition } from "@sidequest/core";
import { SidequestConfig } from "../engine";
import { JobTransitioner } from "../job/job-transitioner";
import { RunnerPool } from "../shared-runner";

export class ExecutorManager {
  private activeByQueue: Record<string, Set<number>>;
  private activeJobs: Set<number>;
  private sidequestConfig: SidequestConfig;
  private runnerPool: RunnerPool;

  constructor(sidequestConfig: SidequestConfig) {
    this.activeByQueue = {};
    this.activeJobs = new Set();
    this.sidequestConfig = sidequestConfig;
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

    const result = await this.runnerPool.run(job);
    const transition = JobTransitionFactory.create(result);

    await JobTransitioner.apply(job, transition);

    this.activeByQueue[queueConfig.name].delete(job.id);
    this.activeJobs.delete(job.id);
  }
}
