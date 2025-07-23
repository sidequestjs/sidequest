import { JobData } from "../core/schema/job-data";
import { QueueConfig } from "../core/schema/queue-config";

export interface Backend {
  setup(): Promise<void> | void;
  close(): Promise<void> | void;

  insertJob(job: JobData): JobData | Promise<JobData>;
  getJob(id: number): JobData | Promise<JobData>;
  claimPendingJob(queue: string, quatity?: number): Promise<JobData[]>;

  getQueuesFromJobs(): string[] | Promise<string[]>;

  getQueueConfig(queue: string): QueueConfig | Promise<QueueConfig>;
  insertQueueConfig(queueConfig: QueueConfig): QueueConfig | Promise<QueueConfig>;

  updateJob(job: JobData): Promise<JobData>;

  listJobs(params: {
    queue?: string;
    jobClass?: string;
    state?: string;
    sinceId?: number;
    limit?: number;
    timeRange?: {
      from?: Date;
      to?: Date;
    };
  }): Promise<JobData[]>;

  listQueues(): Promise<QueueConfig[]>;
}
