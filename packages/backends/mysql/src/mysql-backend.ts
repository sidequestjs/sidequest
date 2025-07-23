import {
  JOB_FALLBACK,
  NewJobData,
  NewQueueData,
  QUEUE_FALLBACK,
  safeParseJobData,
  SQLBackend,
  UpdateJobData,
  UpdateQueueData,
  whereOrWhereIn,
} from "@sidequest/backend";
import { DuplicatedJobError, JobData, JobState, logger, QueueConfig } from "@sidequest/core";
import createKnex, { Knex } from "knex";
import path from "path";

export default class MysqlBackend extends SQLBackend {
  constructor(dbConfig: string | Knex.ConnectionConfig) {
    const knex = createKnex({
      client: "mysql2",
      connection: dbConfig,
      migrations: {
        directory: path.join(import.meta.dirname, "..", "migrations"),
        tableName: "sidequest_migrations",
        extension: "cjs",
      },
    });
    super(knex);
  }

  async insertQueueConfig(queueConfig: NewQueueData): Promise<QueueConfig> {
    const data: NewQueueData = {
      ...QUEUE_FALLBACK,
      ...queueConfig,
    };

    logger("Backend").debug(`Inserting new queue config: ${JSON.stringify(data)}`);
    const result = await this.knex.transaction(async (trx) => {
      const [insertedId] = await trx("sidequest_queues").insert(data);

      const inserted = await trx<QueueConfig>("sidequest_queues").where({ id: insertedId }).first();

      if (!inserted) throw new Error("Failed to insert queue config.");

      return inserted;
    });
    logger("Backend").debug(`Queue inserted successfully: ${JSON.stringify(result)}`);

    return result;
  }

  async updateQueue(queueData: UpdateQueueData): Promise<QueueConfig> {
    const { id, ...updates } = queueData;
    logger("Backend").debug(`Updating queue: ${JSON.stringify(queueData)}`);

    if (!id) throw new Error("Queue id is required for update.");

    const result = await this.knex.transaction(async (trx) => {
      await trx("sidequest_queues").where({ id }).update(updates);

      const updated = await trx<QueueConfig>("sidequest_queues").where({ id }).first();

      if (!updated) throw new Error("Cannot update queue, not found.");

      return updated;
    });

    logger("Backend").debug(`Queue updated successfully: ${JSON.stringify(result)}`);
    return result;
  }

  async createNewJob(job: NewJobData): Promise<JobData> {
    const data = {
      queue: job.queue,
      script: job.script,
      class: job.class,
      args: JSON.stringify(job.args ?? JOB_FALLBACK.args),
      constructor_args: JSON.stringify(job.constructor_args ?? JOB_FALLBACK.constructor_args),
      state: job.state,
      attempt: job.attempt,
      max_attempts: job.max_attempts ?? JOB_FALLBACK.max_attempts,
      available_at: job.available_at ?? JOB_FALLBACK.available_at,
      timeout: job.timeout ?? JOB_FALLBACK.timeout,
      unique_digest: job.unique_digest ?? JOB_FALLBACK.unique_digest,
      uniqueness_config: job.uniqueness_config ? JSON.stringify(job.uniqueness_config) : JOB_FALLBACK.uniqueness_config,
      inserted_at: new Date(),
    };
    logger("Backend").debug(`Creating new job: ${JSON.stringify(data)}`);

    try {
      const insertedJob = await this.knex.transaction(async (trx) => {
        const [insertedId] = await trx("sidequest_jobs").insert(data);

        const inserted = await trx<JobData>("sidequest_jobs").where({ id: insertedId }).first();

        if (!inserted) throw new Error("Failed to create job.");

        logger("Backend").debug(`Job created successfully: ${JSON.stringify(inserted)}`);
        return safeParseJobData(inserted);
      });

      return insertedJob;
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

  async updateJob(job: UpdateJobData): Promise<JobData> {
    const data = {
      ...job,
      args: job.args ? JSON.stringify(job.args) : job.args,
      constructor_args: job.constructor_args ? JSON.stringify(job.constructor_args) : job.constructor_args,
      result: job.result ? JSON.stringify(job.result) : job.result,
      errors: job.errors ? JSON.stringify(job.errors) : job.errors,
      uniqueness_config: job.uniqueness_config ? JSON.stringify(job.uniqueness_config) : job.uniqueness_config,
    };
    logger("Backend").debug(`Updating job: ${JSON.stringify(data)}`);

    const updatedJob = await this.knex.transaction(async (trx) => {
      await trx("sidequest_jobs").where({ id: job.id }).update(data);

      const updated = await trx<JobData>("sidequest_jobs").where({ id: job.id }).first();

      if (!updated) throw new Error("Cannot update job, not found.");

      return safeParseJobData(updated);
    });

    logger("Backend").debug(`Job updated successfully: ${JSON.stringify(updatedJob)}`);
    return updatedJob;
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

      if (args) query.whereRaw("JSON_CONTAINS(args, ?)", [JSON.stringify(args)]);
      if (timeRange?.from) query.andWhere("attempted_at", ">=", timeRange.from);
      if (timeRange?.to) query.andWhere("attempted_at", "<=", timeRange.to);
    }

    const rawJobs = (await query) as JobData[];

    return rawJobs.map(safeParseJobData);
  }
}
