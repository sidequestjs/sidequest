import { SQLBackend } from "@sidequest/backend";
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
