import createKnex, { Knex } from "knex";
import os from "os";
import path from "path";
import { JobData } from "../../core/schema/job-data";
import { QueueConfig } from "../../core/schema/queue-config";
import { Backend } from "../backend";

function safeParse<T = any>(value: any): T | null {
  try {
    return typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    return null;
  }
}

export class SqliteBackend implements Backend {
  knex: Knex<any, unknown[]>;

  constructor(filePath: string = "./sidequest.sqlite") {
    this.knex = createKnex({
      client: "sqlite3",
      connection: {
        filename: filePath,
      },
      useNullAsDefault: true,
      migrations: {
        directory: path.join(import.meta.dirname, "..", "..", "..", "migrations", "sqlite"),
        tableName: "sidequest_migrations",
        extension: "cjs",
      },
    });
  }

  async insertQueueConfig(queueConfig: QueueConfig): Promise<QueueConfig> {
    const [newConfig] = await this.knex("sidequest_queues").insert(queueConfig).returning("*");
    return newConfig;
  }

  async getQueueConfig(queue: string): Promise<QueueConfig> {
    return this.knex("sidequest_queues").where({ queue }).first();
  }

  async getQueuesFromJobs(): Promise<string[]> {
    const queues = await this.knex("sidequest_jobs").select("queue").distinct();
    return queues.map((q) => q.queue);
  }

  getJob(id: number): JobData | Promise<JobData> {
    return this.knex("sidequest_jobs").where({ id }).first();
  }

  async insertJob(job: JobData): Promise<JobData> {
    const data = {
      queue: job.queue,
      class: job.class,
      script: job.script,
      args: JSON.stringify(job.args),
      result: job.result ? JSON.stringify(job.result) : null,
      errors: job.errors ? JSON.stringify(job.errors) : null,
      state: job.state || "pending",
      available_at: job.available_at || new Date().toISOString(),
      inserted_at: job.inserted_at || new Date().toISOString(),
      attempted_at: job.attempted_at,
      completed_at: job.completed_at,
      discarded_at: job.discarded_at,
      cancelled_at: job.cancelled_at,
      claimed_at: job.claimed_at,
      claimed_by: job.claimed_by,
      attempt: job.attempt,
      max_attempts: job.max_attempts,
    };

    const inserted = await this.knex("sidequest_jobs").insert(data).returning("*");

    return inserted[0];
  }

  async claimPendingJob(queue: string, quantity: number = 1): Promise<JobData[]> {
    const workerName = `sidequest@${os.hostname()}-${process.pid}`;

    return await this.knex.transaction(async (trx) => {
      const jobs = await trx("sidequest_jobs")
        .where("state", "pending")
        .andWhere("queue", queue)
        .andWhere("available_at", "<=", new Date().toISOString())
        .orderBy("inserted_at")
        .limit(quantity)
        .forUpdate();

      const ids = jobs.map((j) => j.id);
      if (ids.length === 0) return [];

      await trx("sidequest_jobs")
        .update({
          claimed_by: workerName,
          claimed_at: new Date().toISOString(),
          state: "claimed",
        })
        .whereIn("id", ids);

      const claimedJobs = await trx("sidequest_jobs").whereIn("id", ids);
      return claimedJobs.map((job) => ({
        ...job,
        args: safeParse(job.args),
        result: safeParse(job.result),
        errors: safeParse(job.errors),
      }));
    });
  }

  async updateJob(job: JobData): Promise<JobData> {
    const data: any = {
      id: job.id,
      queue: job.queue,
      state: job.state,
      script: job.script,
      class: job.class,
      attempt: job.attempt,
      max_attempts: job.max_attempts,
      inserted_at: job.inserted_at,
      attempted_at: job.attempted_at,
      available_at: job.available_at,
      completed_at: job.completed_at,
      discarded_at: job.discarded_at,
      cancelled_at: job.cancelled_at,
      claimed_at: job.claimed_at,
      claimed_by: job.claimed_by,
      args: job.args ? JSON.stringify(job.args) : null,
      result: job.result ? JSON.stringify(job.result) : null,
      errors: job.errors ? JSON.stringify(job.errors) : null,
    };

    const [updated] = await this.knex("sidequest_jobs").where({ id: job.id }).update(data).returning("*");

    if (!updated) throw new Error("Cannot update job, not found.");

    return {
      ...updated,
      args: safeParse(updated.args),
      result: safeParse(updated.result),
      errors: safeParse(updated.errors),
    };
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

    const rawJobs = await query;

    return rawJobs.map((job) => ({
      ...job,
      args: safeParse(job.args),
      result: safeParse(job.result),
      errors: safeParse(job.errors),
    }));
  }

  async listQueues(): Promise<QueueConfig[]> {
    return await this.knex("sidequest_queues").select("*").orderBy("priority", "desc");
  }

  async setup(): Promise<void> {
    try {
      const [batchNo, log] = await this.knex.migrate.latest();
      if (log.length > 0) {
        console.log(`Migrated batch ${batchNo}:`);
        log.forEach((file: any) => console.log(`  - ${file}`));
      }
    } catch (err) {
      console.error("Migration failed:", err);
    }
  }

  async close(): Promise<void> {
    await this.knex.destroy();
  }
}
