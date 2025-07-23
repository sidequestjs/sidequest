import { DuplicatedJobError, JobData, JobState, logger, QueueConfig } from "@sidequest/core";
import { Knex } from "knex";
import { hostname } from "os";
import { Backend, NewJobData, NewQueueData, UpdateJobData, UpdateQueueData } from "./backend";
import { safeParseJobData, whereOrWhereIn } from "./utils";

export abstract class SQLBackend implements Backend {
  constructor(public knex: Knex) {}

  async migrate(): Promise<void> {
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

  async rollbackMigration(): Promise<void> {
    try {
      const [batchNo, log] = (await this.knex.migrate.rollback()) as [number, string[]];
      if (log.length > 0) {
        logger().info(`Rollback batch ${batchNo}:`);
        log.forEach((file) => logger().info(`  - ${file}`));
      }
    } catch (err) {
      logger().error("Rollback failed:", err);
    }
  }

  async close(): Promise<void> {
    await this.knex.destroy();
  }

  async insertQueueConfig(queueConfig: NewQueueData): Promise<QueueConfig> {
    const data: NewQueueData = {
      name: queueConfig.name,
      concurrency: queueConfig.concurrency ?? 10,
      priority: queueConfig.priority ?? 0,
      state: queueConfig.state ?? "active",
    };

    const newConfig = await this.knex("sidequest_queues").insert(data).returning("*");
    return newConfig[0] as QueueConfig;
  }

  async getQueueConfig(queue: string): Promise<QueueConfig | undefined> {
    return this.knex("sidequest_queues").where({ name: queue }).first() as Promise<QueueConfig | undefined>;
  }

  async getQueuesFromJobs(): Promise<string[]> {
    const queues: { queue: string }[] = await this.knex("sidequest_jobs").select("queue").distinct();
    return queues.map((q) => q.queue);
  }

  async listQueues(orderBy?: { column: keyof QueueConfig; order?: "asc" | "desc" }): Promise<QueueConfig[]> {
    return (await this.knex("sidequest_queues")
      .select("*")
      .orderBy(orderBy?.column ?? "priority", orderBy?.order ?? "desc")) as QueueConfig[];
  }

  async updateQueue(queueData: UpdateQueueData) {
    const { id, ...updates } = queueData;
    if (!id) throw new Error("Queue id is required for update.");

    const [updated] = (await this.knex("sidequest_queues")
      .where({ id })
      .update(updates)
      .returning("*")) as QueueConfig[];

    if (!updated) throw new Error("Cannot update queue, not found.");

    return updated;
  }

  async getJob(id: number): Promise<JobData | undefined> {
    const job = (await this.knex("sidequest_jobs").where({ id }).first()) as JobData | undefined;
    if (job) {
      return safeParseJobData(job);
    }
  }

  async createNewJob(job: NewJobData): Promise<JobData> {
    const data = {
      queue: job.queue,
      script: job.script,
      class: job.class,
      args: JSON.stringify(job.args ?? []),
      constructor_args: JSON.stringify(job.constructor_args ?? []),
      state: job.state,
      attempt: job.attempt,
      max_attempts: job.max_attempts ?? 5,
      available_at: job.available_at ?? new Date(),
      timeout: job.timeout ?? null,
      unique_digest: job.unique_digest ?? null,
      uniqueness_config: job.uniqueness_config ? JSON.stringify(job.uniqueness_config) : null,
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
          claimed_at: new Date(),
          state: "claimed",
        })
        .where("state", "waiting")
        .andWhere("queue", queue)
        .andWhere("available_at", "<=", new Date())
        .orderBy("inserted_at")
        .limit(quantity)
        .returning("*"),
    )) as JobData[];

    return result.map(safeParseJobData);
  }

  async updateJob(job: UpdateJobData): Promise<JobData> {
    const data = {
      ...job,
      args: job.args ? JSON.stringify(job.args) : job.args,
      constructor_args: job.constructor_args ? JSON.stringify(job.constructor_args) : job.constructor_args,
      result: job.result ? JSON.stringify(job.result) : job.result,
      errors: job.errors ? JSON.stringify(job.errors) : job.errors,
      uniqueness_config: job.uniqueness_config ? JSON.stringify(job.uniqueness_config) : job.uniqueness_config,
    };

    const [updated] = (await this.knex("sidequest_jobs")
      .where({ id: job.id })
      .update(data)
      .returning("*")) as JobData[];

    if (!updated) throw new Error("Cannot update job, not found.");

    return safeParseJobData(updated);
  }

  async listJobs(params?: {
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
  }): Promise<JobData[]> {
    const limit = params?.limit ?? 50;
    const offset = params?.offset ?? 0;

    const query = this.knex("sidequest_jobs").select("*").orderBy("id", "desc").limit(limit).offset(offset);

    if (params) {
      const { queue, jobClass, state, timeRange, args } = params;

      whereOrWhereIn(query, "queue", queue);
      whereOrWhereIn(query, "class", jobClass);
      whereOrWhereIn(query, "state", state);

      if (args) query.where("args", JSON.stringify(args));
      if (timeRange?.from) query.andWhere("attempted_at", ">=", timeRange.from);
      if (timeRange?.to) query.andWhere("attempted_at", "<=", timeRange.to);
    }

    const rawJobs = (await query) as JobData[];

    return rawJobs.map(safeParseJobData);
  }

  async staleJobs(maxStaleMs = 600_000, maxClaimedMs = 60_000): Promise<JobData[]> {
    const now = new Date();
    const jobs = (await this.knex("sidequest_jobs")
      .select("*")
      .where((qb) => {
        qb.where("state", "claimed")
          .andWhereNot("claimed_at", null)
          .andWhere("claimed_at", "<", new Date(now.getTime() - maxClaimedMs));
      })
      .orWhere((qb) => {
        qb.where("state", "running").andWhereNot("attempted_at", null);
      })) as JobData[];

    const parsedJobs = jobs.map(safeParseJobData);

    // We filter the running here to account for timeout and different DBs
    const filtered = parsedJobs.filter((job) => {
      if (job.state === "running" && job.timeout != null) {
        return new Date(job.attempted_at!).getTime() < now.getTime() - job.timeout;
      }
      if (job.state === "running" && job.timeout == null) {
        return new Date(job.attempted_at!).getTime() < now.getTime() - maxStaleMs;
      }
      return true; // already filtered `claimed` by SQL
    });
    return filtered;
  }

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
