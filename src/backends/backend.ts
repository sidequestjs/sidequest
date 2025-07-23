import { QueueConfig } from "../sidequest";
import { Job } from "../core/job";

export interface Backend {
  setup(): Promise<void> | void;
  close():  Promise<void> | void;

  insertJob(job: Job, args: any[]): void | Promise<void>;
  claimPendingJob(queue: string, quatity?: number): Promise<Job[]>;

  getQueuesFromJobs(): string[] | Promise<string[]>;
  getQueueConfig(queue: string, fallback?: QueueConfig): QueueConfig | Promise<QueueConfig>;
  updateJob(job: Job): Promise<Job>;
}