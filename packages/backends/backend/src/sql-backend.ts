import { DuplicatedJobError, JobData, JobState, logger, QueueConfig } from "@sidequest/core";
import { Knex } from "knex";
import { hostname } from "os";
import { Backend, NewJobData, NewQueueData, UpdateJobData, UpdateQueueData } from "./backend";
import { JOB_FALLBACK, MISC_FALLBACK, QUEUE_FALLBACK } from "./constants";
import { safeParseJobData, whereOrWhereIn } from "./utils";

/**
 * Abstract base class for SQL-backed implementations of the {@link Backend} interface.
 *
 * Provides common methods for managing job queues and jobs using a SQL database via Knex.js.
 * Handles queue configuration, job creation, claiming, updating, and cleanup, as well as
 * database migrations and connection management.
 *
 * @remarks
 * This class is intended to be extended by concrete backend implementations.
 *
 * @see {@link Backend}
 */
export abstract class SQLBackend implements Backend {
  /**
   * Creates a new SQLBackend instance.
   * @param knex The Knex.js instance for database access.
   */
  constructor(public knex: Knex) {}

  async migrate(): Promise<void> {
    try {
      logger("Backend").debug(`Starting database migration`);
      const [batchNo, log] = (await this.knex.migrate.latest()) as [number, string[]];
      if (log.length > 0) {
        logger("Backend").info(`Migrated batch ${batchNo}:`);
        log.forEach((file) => logger("Backend").info(`  - ${file}`));
      } else {
        logger("Backend").debug(`No migrations to apply`);
      }
    } catch (err) {
      logger("Backend").error("Migration failed:", err);
    }
  }

  async rollbackMigration(): Promise<void> {
    try {
      logger("Backend").info(`Rolling back migrations`);
      const [batchNo, log] = (await this.knex.migrate.rollback()) as [number, string[]];
      if (log.length > 0) {
        logger("Backend").info(`Rollback batch ${batchNo}:`);
        log.forEach((file) => logger("Backend").info(`  - ${file}`));
      } else {
        logger("Backend").debug(`No migrations to rollback`);
      }
    } catch (err) {
      logger("Backend").error("Rollback failed:", err);
    }
  }

  async close(): Promise<void> {
    logger("Backend").info(`Closing database connection`);
    await this.knex.destroy();
  }

  async insertQueueConfig(queueConfig: NewQueueData): Promise<QueueConfig> {
    const data: NewQueueData = {
      ...QUEUE_FALLBACK,
      ...queueConfig,
    };

    logger("Backend").debug(`Inserting new queue config: ${JSON.stringify(data)}`);
    const newConfig = (await this.knex("sidequest_queues").insert(data).returning("*")) as QueueConfig[];
    logger("Backend").debug(`Queue inserted successfully: ${JSON.stringify(newConfig[0])}`);

    return newConfig[0];
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
    logger("Backend").debug(`Updating queue: ${JSON.stringify(queueData)}`);

    if (!id) throw new Error("Queue id is required for update.");

    const [updated] = (await this.knex("sidequest_queues")
      .where({ id })
      .update(updates)
      .returning("*")) as QueueConfig[];

    if (!updated) throw new Error("Cannot update queue, not found.");

    logger("Backend").debug(`Queue updated successfully: ${JSON.stringify(updated)}`);
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
      const inserted = (await this.knex("sidequest_jobs").insert(data).returning("*")) as JobData[];
      logger("Backend").debug(`Job created successfully: ${JSON.stringify(inserted)}`);

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

    const jobs = await this.knex.transaction(async (trx) => {
      const selected: JobData[] = await trx<JobData>("sidequest_jobs")
        .select("*")
        .where("state", "waiting")
        .andWhere("queue", queue)
        .andWhere("available_at", "<=", new Date())
        .orderBy("inserted_at")
        .limit(quantity)
        .forUpdate()
        .skipLocked();

      if (selected.length === 0) {
        return [];
      }

      const ids = selected.map((job) => job.id);

      await trx<JobData>("sidequest_jobs").whereIn("id", ids).update({
        claimed_by: workerName,
        claimed_at: new Date(),
        state: "claimed",
      });

      const updated = await trx<JobData>("sidequest_jobs").whereIn("id", ids).select("*");

      return updated;
    });

    return jobs.map(safeParseJobData);
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
    const [updated] = (await this.knex("sidequest_jobs")
      .where({ id: job.id })
      .update(data)
      .returning("*")) as JobData[];

    if (!updated) throw new Error("Cannot update job, not found.");

    logger("Backend").debug(`Job updated successfully: ${JSON.stringify(updated)}`);

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

  async staleJobs(
    maxStaleMs = MISC_FALLBACK.maxStaleMs,
    maxClaimedMs = MISC_FALLBACK.maxClaimedMs,
  ): Promise<JobData[]> {
    const now = new Date();
    logger("Backend").debug(
      `Fetching stale jobs older than ${maxStaleMs}ms and claimed jobs older than ${maxClaimedMs}ms`,
    );
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

    logger("Backend").debug(`Found ${filtered.length} stale jobs`);

    return filtered;
  }

  async deleteFinishedJobs(cutoffDate: Date): Promise<void> {
    logger("Backend").debug(`Deleting finished jobs older than ${cutoffDate.toISOString()}`);
    await this.knex("sidequest_jobs")
      .where((qb) => {
        qb.where("completed_at", "<", cutoffDate)
          .orWhere("failed_at", "<", cutoffDate)
          .orWhere("cancelled_at", "<", cutoffDate);
      })
      .del();
  }

  async truncate() {
    logger("Backend").debug(`Truncating all job and queue tables`);
    await this.knex("sidequest_jobs").truncate();
    await this.knex("sidequest_queues").truncate();
  }
}
