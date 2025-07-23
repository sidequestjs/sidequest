import { Job } from "../core/job";

export interface Backend {
  setup(): Promise<void> | void;
  close():  Promise<void> | void;

  insertJob(job: Job, args: any[]): void | Promise<void>;
  claimPendingJob(queue: string, quatity?: number): Promise<Job[]>;

  getQueuesNames(): string[] | Promise<string[]>;
  updateJob(job: Job): Promise<Job>;
}