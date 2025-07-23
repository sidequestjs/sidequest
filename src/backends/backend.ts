import { QueueConfig } from "src/core/schema/queue-config";
import { JobData } from "src/core/schema/job-data";

export interface Backend {
  setup(): Promise<void> | void;
  close():  Promise<void> | void;

  insertJob(job: JobData): void | Promise<void>;
  claimPendingJob(queue: string, quatity?: number): Promise<JobData[]>;

  getQueuesFromJobs(): string[] | Promise<string[]>;

  getQueueConfig(queue: string): QueueConfig | Promise<QueueConfig>;
  insertQueueConfig(queueConfig: QueueConfig): QueueConfig | Promise<QueueConfig>;
  
  updateJob(job: JobData): Promise<JobData>;
}