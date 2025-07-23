import { SQLBackend, UpdateJobData } from "@sidequest/backend";
import { JobData, JobState } from "@sidequest/core";
import createKnex, { Knex } from "knex";
import path from "path";

export default class PostgresBackend extends SQLBackend {
  constructor(dbConfig: { connection: string | Knex.ConnectionConfig }) {
    const knex = createKnex({
      client: "pg",
      connection: dbConfig.connection,
      migrations: {
        directory: path.join(import.meta.dirname, "..", "migrations"),
        tableName: "sidequest_migrations",
        extension: "cjs",
      },
    });
    super(knex);
  }

  async updateJob(job: UpdateJobData): Promise<JobData> {
    const data: Record<string, unknown> = {
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
      failed_at: job.failed_at,
      cancelled_at: job.cancelled_at,
      claimed_at: job.claimed_at,
      claimed_by: job.claimed_by,
      unique_digest: job.unique_digest,
    };

    if (job.args) data.args = this.knex.raw("?", [JSON.stringify(job.args)]);
    if (job.result) data.result = this.knex.raw("?", JSON.stringify(job.result));
    if (job.errors && job.errors.length > 0) data.errors = job.errors;
    if (job.uniqueness_config) data.uniqueness_config = this.knex.raw("?", [JSON.stringify(job.uniqueness_config)]);

    const updated = await this.knex("sidequest_jobs").update(data).where({ id: job.id }).returning("*");

    if (updated.length > 0) return updated[0] as JobData;

    throw Error("Cannot update job, not found.");
  }

  async listJobs({
    queue,
    jobClass,
    state,
    sinceId,
    limit = 50,
    timeRange,
    args,
  }: {
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
  }): Promise<JobData[]> {
    const query = this.knex("sidequest_jobs").select("*").orderBy("id", "desc").limit(limit);

    if (queue) query.where("queue", queue);
    if (state) {
      if (typeof state === "string") {
        query.where("state", state);
      } else {
        query.whereIn("state", state);
      }
    }
    if (sinceId) query.where("id", "<", sinceId);
    if (jobClass) query.where("class", jobClass);
    if (args) query.where("args", JSON.stringify(args));
    if (timeRange?.from) query.where("attempted_at", ">=", timeRange.from);
    if (timeRange?.to) query.where("attempted_at", "<=", timeRange.to);

    const result = await query;
    return result as JobData[];
  }
}
