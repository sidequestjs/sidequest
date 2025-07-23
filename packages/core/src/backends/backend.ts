import { JobData, JobState } from "../schema/job-data";
import { QueueConfig } from "../schema/queue-config";

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
    state?: JobState | JobState[];
    sinceId?: number;
    limit?: number;
    args?: unknown;
    timeRange?: {
      from?: Date;
      to?: Date;
    };
  }): Promise<JobData[]>;

  listQueues(): Promise<QueueConfig[]>;
}
