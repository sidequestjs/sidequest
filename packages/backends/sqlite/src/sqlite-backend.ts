import { Backend, JobData, logger, QueueConfig } from "@sidequest/core";
import createKnex, { Knex } from "knex";
import os from "os";
import path from "path";

function safeParse<T = unknown>(value: unknown): T | null {
  try {
    return (typeof value === "string" ? JSON.parse(value) : value) as T;
  } catch {
    return null;
  }
}

export default class SqliteBackend implements Backend {
  knex: Knex;

  constructor(filePath = "./sidequest.sqlite") {
    this.knex = createKnex({
      client: "sqlite3",
      connection: {
        filename: filePath,
      },
      useNullAsDefault: true,
      migrations: {
        directory: path.join(import.meta.dirname, "..", "migrations"),
        tableName: "sidequest_migrations",
        extension: "cjs",
      },
    });
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

  getJob(id: number): JobData | Promise<JobData> {
    return this.knex("sidequest_jobs").where({ id }).first();
  }

  async insertJob(job: JobData): Promise<JobData> {
    const data = {
      ...job,
      args: JSON.stringify(job.args),
      result: job.result ? JSON.stringify(job.result) : null,
      errors: job.errors ? JSON.stringify(job.errors) : null,
      state: job.state ?? "waiting",
      available_at: job.available_at ?? new Date().toISOString(),
      inserted_at: job.inserted_at ?? new Date().toISOString(),
    };

    const inserted = await this.knex("sidequest_jobs").insert(data).returning("*");

    return inserted[0] as JobData;
  }

  async claimPendingJob(queue: string, quantity = 1): Promise<JobData[]> {
    const workerName = `sidequest@${os.hostname()}-${process.pid}`;

    return this.knex.transaction(async (trx) => {
      const jobs = (await trx("sidequest_jobs")
        .where("state", "waiting")
        .andWhere("queue", queue)
        .andWhere("available_at", "<=", new Date().toISOString())
        .orderBy("inserted_at")
        .limit(quantity)
        .forUpdate()) as JobData[];

      const ids = jobs.map((j) => j.id!);
      if (ids.length === 0) return [];

      await trx("sidequest_jobs")
        .update({
          claimed_by: workerName,
          claimed_at: new Date().toISOString(),
          state: "claimed",
        })
        .whereIn("id", ids);

      const claimedJobs = (await trx("sidequest_jobs").whereIn("id", ids)) as JobData[];
      return claimedJobs.map((job) => ({
        ...job,
        args: safeParse(job.args),
        result: safeParse(job.result),
        errors: safeParse(job.errors),
      })) as JobData[];
    });
  }

  async updateJob(job: JobData): Promise<JobData> {
    const data = {
      ...job,
      args: job.args ? JSON.stringify(job.args) : null,
      result: job.result ? JSON.stringify(job.result) : null,
      errors: job.errors ? JSON.stringify(job.errors) : null,
    };

    const [updated] = (await this.knex("sidequest_jobs")
      .where({ id: job.id })
      .update(data)
      .returning("*")) as JobData[];

    if (!updated) throw new Error("Cannot update job, not found.");

    return {
      ...updated,
      args: safeParse(updated.args),
      result: safeParse(updated.result),
      errors: safeParse(updated.errors),
    } as JobData;
  }

  async listJobs(params: {
    queue?: string;
    jobClass?: string;
    state?: string;
    sinceId?: number;
    limit?: number;
    timeRange?: {
      from?: Date;
      to?: Date;
    };
  }): Promise<JobData[]> {
    const { queue, jobClass, state, sinceId, limit = 50, timeRange } = params;

    const query = this.knex("sidequest_jobs").select("*").orderBy("id", "desc").limit(limit);

    if (queue) query.where("queue", queue);
    if (state) query.where("state", state);
    if (sinceId) query.where("id", "<", sinceId);
    if (jobClass) query.where("class", jobClass);
    if (timeRange?.from) query.where("attempted_at", ">=", timeRange.from.toISOString());
    if (timeRange?.to) query.where("attempted_at", "<=", timeRange.to.toISOString());

    const rawJobs = (await query) as JobData[];

    return rawJobs.map((job) => ({
      ...job,
      args: safeParse(job.args),
      result: safeParse(job.result),
      errors: safeParse(job.errors),
    })) as JobData[];
  }

  async listQueues(): Promise<QueueConfig[]> {
    return (await this.knex("sidequest_queues").select("*").orderBy("priority", "desc")) as QueueConfig[];
  }

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
}
