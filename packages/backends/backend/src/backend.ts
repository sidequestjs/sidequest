import { DuplicatedJobError, JobData, JobState, logger, QueueConfig } from "@sidequest/core";
import { Knex } from "knex";
import { hostname } from "os";
import { safeParseJobData } from "./utils";

export type NewJobData = Pick<JobData, "queue" | "script" | "class" | "args" | "constructor_args"> &
  Partial<Pick<JobData, "max_attempts" | "available_at" | "timeout" | "unique_digest" | "uniqueness_config">> & {
    state: "waiting";
    attempt: 0;
  };

export type UpdateJobData = Pick<JobData, "id"> & Partial<Omit<JobData, "id">>;

export abstract class SQLBackend {
  constructor(public knex: Knex) {}

  async setup(): Promise<void> {
    try {
      const [batchNo, log] = (await this.knex.migrate.latest()) as [number, string[]];
      if (log.length > 0) {
        logger().info(`Migrated batch ${batchNo}:`);
        log.forEach((file) => logger().info(`  - ${file}`));
      }
    } catch (err) {
      logger().error("Migration failed:", err);
    }
  }

  async close(): Promise<void> {
    await this.knex.destroy();
  }

  async insertQueueConfig(queueConfig: QueueConfig): Promise<QueueConfig> {
    const newConfig = await this.knex("sidequest_queues").insert(queueConfig).returning("*");
    return newConfig[0] as QueueConfig;
  }

  async getQueueConfig(queue: string): Promise<QueueConfig> {
    return this.knex("sidequest_queues").where({ queue }).first() as Promise<QueueConfig>;
  }

  async getQueuesFromJobs(): Promise<string[]> {
    const queues: QueueConfig[] = await this.knex("sidequest_jobs").select("queue").distinct();
    return queues.map((q) => q.queue);
  }

  async listQueues(): Promise<QueueConfig[]> {
    return (await this.knex("sidequest_queues").select("*").orderBy("priority", "desc")) as QueueConfig[];
  }

  async getJob(id: number): Promise<JobData> {
    return (await this.knex("sidequest_jobs").where({ id }).first()) as JobData;
  }

  async createNewJob(job: NewJobData): Promise<JobData> {
    const data = {
      queue: job.queue,
      script: job.script,
      class: job.class,
      args: this.knex.raw("?", [JSON.stringify(job.args)]),
      constructor_args: this.knex.raw("?", [JSON.stringify(job.constructor_args)]),
      state: job.state,
      attempt: job.attempt,
      max_attempts: job.max_attempts ?? 5,
      available_at: job.available_at ?? new Date(),
      timeout: job.timeout ?? null,
      unique_digest: job.unique_digest ?? null,
      uniqueness_config: job.uniqueness_config ? this.knex.raw("?", [JSON.stringify(job.uniqueness_config)]) : null,
      inserted_at: new Date(),
    };

    try {
      const inserted = (await this.knex("sidequest_jobs").insert(data).returning("*")) as JobData[];

      return safeParseJobData(inserted[0]);
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message?.includes("sidequest_jobs.unique_digest") ||
          ("constraint" in error && error.constraint === "sidequest_jobs_unique_digest_active_idx"))
      ) {
        throw new DuplicatedJobError(job as JobData);
      }

      throw error;
    }
  }

  async claimPendingJob(queue: string, quantity = 1): Promise<JobData[]> {
    const workerName = `sidequest@${hostname()}-${process.pid}`;

    const result = (await this.knex.transaction(async (trx) =>
      trx("sidequest_jobs")
        .update({
          claimed_by: workerName,
          claimed_at: new Date().toISOString(),
          state: "claimed",
        })
        .where("state", "waiting")
        .andWhere("queue", queue)
        .andWhere("available_at", "<=", new Date().toISOString())
        .orderBy("inserted_at")
        .limit(quantity)
        .returning("*"),
    )) as JobData[];

    return result.map(safeParseJobData);
  }

  abstract updateJob(job: UpdateJobData): Promise<JobData>;

  abstract listJobs(params: {
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

  abstract staleJobs(maxStaleMs?: number, maxClaimedMs?: number): Promise<JobData[]>;

  async deleteFinishedJobs(cutoffDate: Date): Promise<void> {
    await this.knex("sidequest_jobs")
      .where((qb) => {
        qb.where("completed_at", "<", cutoffDate)
          .orWhere("failed_at", "<", cutoffDate)
          .orWhere("cancelled_at", "<", cutoffDate);
      })
      .del();
  }

  async truncate() {
    await this.knex("sidequest_jobs").truncate();
    await this.knex("sidequest_queues").truncate();
  }
}
