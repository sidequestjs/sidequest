import { JobData, JobState, QueueConfig } from "@sidequest/core";

export type NewJobData = Pick<JobData, "queue" | "script" | "class" | "args" | "constructor_args"> &
  Partial<Pick<JobData, "max_attempts" | "available_at" | "timeout" | "unique_digest" | "uniqueness_config">> & {
    state: "waiting";
    attempt: 0;
  };
export type UpdateJobData = Pick<JobData, "id"> & Partial<Omit<JobData, "id">>;

export type NewQueueData = Pick<QueueConfig, "name"> & Partial<Omit<QueueConfig, "queue" | "id">>;
export type UpdateQueueData = Pick<QueueConfig, "id"> & Partial<Omit<QueueConfig, "id">>;

export interface Backend {
  setup(): Promise<void>;

  close(): Promise<void>;

  insertQueueConfig(queueConfig: NewQueueData): Promise<QueueConfig>;

  getQueueConfig(queue: string): Promise<QueueConfig | undefined>;

  getQueuesFromJobs(): Promise<string[]>;

  listQueues(orderBy?: { column: keyof QueueConfig; order?: "asc" | "desc" }): Promise<QueueConfig[]>;

  updateQueue(queueData: UpdateQueueData): Promise<QueueConfig>;

  getJob(id: number): Promise<JobData | undefined>;

  createNewJob(job: NewJobData): Promise<JobData>;

  claimPendingJob(queue: string, quantity?: number): Promise<JobData[]>;

  updateJob(job: UpdateJobData): Promise<JobData>;

  listJobs(params?: {
    queue?: string | string[];
    jobClass?: string | string[];
    state?: JobState | JobState[];
    limit?: number;
    offset?: number;
    args?: unknown[];
    timeRange?: {
      from?: Date;
      to?: Date;
    };
  }): Promise<JobData[]>;

  staleJobs(maxStaleMs?: number, maxClaimedMs?: number): Promise<JobData[]>;

  deleteFinishedJobs(cutoffDate: Date): Promise<void>;

  truncate(): Promise<void>;
}
