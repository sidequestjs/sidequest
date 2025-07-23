import { SQLBackend, UpdateJobData } from "@sidequest/backend";
import { JobData, JobState } from "@sidequest/core";
import createKnex from "knex";
import path from "path";

function safeParse<T = unknown>(value: unknown): T | null {
  try {
    return (typeof value === "string" ? JSON.parse(value) : value) as T;
  } catch {
    return null;
  }
}

export default class SqliteBackend extends SQLBackend {
  constructor(filePath = "./sidequest.sqlite") {
    const knex = createKnex({
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
    super(knex);
  }

  async updateJob(job: UpdateJobData): Promise<JobData> {
    const data = {
      ...job,
      args: job.args ? JSON.stringify(job.args) : job.args,
      constructor_args: job.constructor_args ? JSON.stringify(job.constructor_args) : job.constructor_args,
      result: job.result ? JSON.stringify(job.result) : job.result,
      errors: job.errors ? JSON.stringify(job.errors) : job.errors,
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
      uniqueness_config: safeParse(job.uniqueness_config),
    } as JobData;
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
    if (timeRange?.from) query.where("attempted_at", ">=", timeRange.from.toISOString());
    if (timeRange?.to) query.where("attempted_at", "<=", timeRange.to.toISOString());

    const rawJobs = (await query) as JobData[];

    return rawJobs.map((job) => ({
      ...job,
      args: safeParse(job.args),
      constructor_args: safeParse(job.constructor_args),
      result: safeParse(job.result),
      errors: safeParse(job.errors),
      uniqueness_config: safeParse(job.uniqueness_config),
    })) as JobData[];
  }
}
