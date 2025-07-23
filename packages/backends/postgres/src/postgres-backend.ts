import { Backend, JobData, QueueConfig } from "@sidequest/core";
import createKnex, { Knex } from "knex";
import os from "os";
import path from "path";

export default class PostgresBackend implements Backend {
  knex: Knex<any, unknown[]>;

  constructor(dbConfig: { connection: string | Knex.ConnectionConfig }) {
    this.knex = createKnex({
      client: "pg",
      connection: dbConfig.connection,
      migrations: {
        directory: path.join(import.meta.dirname, "..", "migrations"),
        tableName: "sidequest_migrations",
        extension: "cjs",
      },
    });
  }

  async insertQueueConfig(queueConfig: QueueConfig): Promise<QueueConfig> {
    const newConfig = await this.knex("sidequest_queues").insert(queueConfig).returning("*");
    return newConfig[0];
  }

  async getQueueConfig(queue: string): Promise<QueueConfig> {
    return this.knex("sidequest_queues").where({ queue: queue }).first();
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
      args: this.knex.raw("?", [JSON.stringify(job.args)]),
      timeout: job.timeout,
    };

    const inserted = await this.knex("sidequest_jobs").insert(data).returning("*");
    return inserted[0];
  }

  async claimPendingJob(queue: string, quatity: number = 1): Promise<JobData[]> {
    const workerName = `sidequest@${os.hostname()}-${process.pid}`;

    const result = await this.knex.transaction(async (trx) => {
      return await trx("sidequest_jobs")
        .update({
          claimed_by: workerName,
          claimed_at: this.knex.fn.now(),
          state: "claimed",
        })
        .whereIn("id", function () {
          this.select("id")
            .from("sidequest_jobs")
            .where("state", "waiting")
            .where("queue", queue)
            .andWhere("available_at", "<=", trx.fn.now())
            .orderBy("inserted_at")
            .forUpdate()
            .skipLocked()
            .limit(quatity);
        })
        .returning("*");
    });

    return result;
  }

  async updateJob(job: JobData): Promise<JobData> {
    const data: any = {
      id: job.id,
      queue: job.queue,
      state: job.state,
      script: job.script,
      class: job.class,
      timeout: job.timeout,
      attempt: job.attempt,
      max_attempts: job.max_attempts,
      errors: job.errors,
      inserted_at: job.inserted_at,
      attempted_at: job.attempted_at,
      available_at: job.available_at,
      completed_at: job.completed_at,
      discarded_at: job.discarded_at,
      cancelled_at: job.cancelled_at,
      claimed_at: job.claimed_at,
      claimed_by: job.claimed_by,
    };

    if (job.args) data.args = this.knex.raw("?", [JSON.stringify(job.args)]);
    if (job.result) data.result = this.knex.raw("?", JSON.stringify(job.result));
    if (job.errors && job.errors.length > 0) data.errors = job.errors;

    const updated = await this.knex("sidequest_jobs").update(data).where({ id: job.id }).returning("*");

    if (updated.length > 0) return updated[0];

    throw Error("Cannot update job, not found.");
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
    if (timeRange?.from) query.where("attempted_at", ">=", timeRange.from);
    if (timeRange?.to) query.where("attempted_at", "<=", timeRange.to);

    const result = await query;
    return result;
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
