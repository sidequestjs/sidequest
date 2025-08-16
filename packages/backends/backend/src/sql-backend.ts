import { DuplicatedJobError, JobData, JobState, logger, QueueConfig } from "@sidequest/core";
import { Knex } from "knex";
import { hostname } from "os";
import { Backend, JobCounts, NewJobData, NewQueueData, UpdateJobData, UpdateQueueData } from "./backend";
import { JOB_FALLBACK, MISC_FALLBACK, QUEUE_FALLBACK } from "./constants";
import { formatDateForBucket, safeParseJobData, whereOrWhereIn } from "./utils";

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

  async createNewQueue(queueConfig: NewQueueData): Promise<QueueConfig> {
    if (queueConfig.concurrency !== undefined && queueConfig.concurrency < 1) {
      throw new Error("Concurrency must be at least 1");
    }

    const data: NewQueueData = {
      ...QUEUE_FALLBACK,
      ...queueConfig,
    };

    logger("Backend").debug(`Inserting new queue config: ${JSON.stringify(data)}`);
    const newConfig = (await this.knex("sidequest_queues").insert(data).returning("*")) as QueueConfig[];
    logger("Backend").debug(`Queue inserted successfully: ${JSON.stringify(newConfig[0])}`);

    return newConfig[0];
  }

  async getQueue(queue: string): Promise<QueueConfig | undefined> {
    return this.knex("sidequest_queues").where({ name: queue }).first() as Promise<QueueConfig | undefined>;
  }

  async getQueuesFromJobs(): Promise<string[]> {
    const queues: { queue: string }[] = await this.knex("sidequest_jobs").select("queue").distinct();
    return queues.map((q) => q.queue);
  }

  async listQueues(orderBy?: { column?: keyof QueueConfig; order?: "asc" | "desc" }): Promise<QueueConfig[]> {
    return (await this.knex("sidequest_queues")
      .select("*")
      .orderBy(orderBy?.column ?? "priority", orderBy?.order ?? "desc")) as QueueConfig[];
  }

  async updateQueue(queueData: UpdateQueueData) {
    if (queueData.concurrency !== undefined && queueData.concurrency < 1) {
      throw new Error("Concurrency must be at least 1");
    }

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

  async countJobs(timeRange?: { from?: Date; to?: Date }): Promise<JobCounts> {
    const query = this.knex("sidequest_jobs").select("state").count("id as count");

    if (timeRange?.from || timeRange?.to) {
      // Use COALESCE to select the first non-null timestamp field
      const timestampExpr = this.knex.raw(`
        COALESCE(completed_at, failed_at, canceled_at, attempted_at, claimed_at, inserted_at)
      `);

      if (timeRange.from) {
        query.andWhereRaw(`(${timestampExpr.toQuery()}) >= ?`, [timeRange.from]);
      }
      if (timeRange.to) {
        query.andWhereRaw(`(${timestampExpr.toQuery()}) <= ?`, [timeRange.to]);
      }
    }

    const results = (await query.groupBy("state")) as { state: JobState; count: string }[];

    const counts: JobCounts = {
      total: 0,
      waiting: 0,
      claimed: 0,
      running: 0,
      completed: 0,
      failed: 0,
      canceled: 0,
    };

    results.forEach((row) => {
      const count = parseInt(row.count, 10);
      counts[row.state] = count;
      counts.total += count;
    });

    return counts;
  }

  async countJobsByQueues(): Promise<Record<string, JobCounts>> {
    // Get all queue names from the queues table and any queues that might only exist in jobs
    const queuesFromTable = await this.knex("sidequest_queues").select("name as queue");
    const queuesFromJobs = await this.knex("sidequest_jobs").select("queue").distinct();

    const queueSet = new Set<string>();
    queuesFromTable.forEach((q: { queue: string }) => queueSet.add(q.queue));
    queuesFromJobs.forEach((q: { queue: string }) => queueSet.add(q.queue));

    // Initialize result with zeroed JobCounts for every queue
    const result: Record<string, JobCounts> = {};
    queueSet.forEach((queue) => {
      result[queue] = {
        total: 0,
        waiting: 0,
        claimed: 0,
        running: 0,
        completed: 0,
        failed: 0,
        canceled: 0,
      };
    });

    // Aggregate jobs by queue and state
    const rows = (await this.knex("sidequest_jobs")
      .select("queue", "state")
      .count("id as count")
      .groupBy("queue", "state")) as { queue: string; state: JobState; count: string }[];

    // Fill counts into the initialized result
    rows.forEach((row) => {
      const count = parseInt(row.count, 10);
      result[row.queue][row.state] = (result[row.queue][row.state] ?? 0) + count;
      result[row.queue].total += count;
    });

    return result;
  }

  async countJobsOverTime(timeRange: string): Promise<({ timestamp: Date } & JobCounts)[]> {
    // Parse time range (e.g., "12m", "12h", "12d")
    const match = /^(\d+)([mhd])$/.exec(timeRange);
    if (!match) {
      throw new Error("Invalid time range format. Use format like '12m', '12h', or '12d'");
    }

    const amount = parseInt(match[1], 10);
    const unit = match[2] as "m" | "h" | "d";

    let intervalMs: number;
    let granularityMs: number;

    switch (unit) {
      case "m":
        intervalMs = amount * 60 * 1000; // minutes to ms
        granularityMs = 60 * 1000; // 1 minute
        break;
      case "h":
        intervalMs = amount * 60 * 60 * 1000; // hours to ms
        granularityMs = 60 * 60 * 1000; // 1 hour
        break;
      case "d":
        intervalMs = amount * 24 * 60 * 60 * 1000; // days to ms
        granularityMs = 24 * 60 * 60 * 1000; // 1 day
        break;
    }

    const now = new Date();
    const startTime = new Date(now.getTime() - intervalMs);

    // Use COALESCE to select the first non-null timestamp field
    const timestampExpr = this.knex.raw(`
      COALESCE(completed_at, failed_at, canceled_at, attempted_at, claimed_at, inserted_at)
    `);

    // Create time buckets and count jobs by state for each bucket
    const query = this.knex("sidequest_jobs")
      .select([
        this.knex.raw(`${this.truncDate(timestampExpr.toQuery(), unit)} as time_bucket`),
        "state",
        this.knex.raw("COUNT(*) as count"),
      ])
      .whereRaw(`${timestampExpr.toQuery()} >= ?`, [startTime])
      .whereRaw(`${timestampExpr.toQuery()} <= ?`, [now])
      .groupBy("time_bucket", "state")
      .orderBy("time_bucket");

    const results = (await query) as { time_bucket: Date | string; state: JobState; count: number }[];

    // Generate all time buckets in the range
    const timeBuckets: Date[] = [];
    for (
      let time = new Date(startTime.getTime() + granularityMs);
      time <= now;
      time = new Date(time.getTime() + granularityMs)
    ) {
      // Round down to the appropriate granularity
      const bucket = new Date(time);
      switch (unit) {
        case "m":
          bucket.setUTCSeconds(0, 0);
          break;
        case "h":
          bucket.setUTCMinutes(0, 0, 0);
          break;
        case "d":
          bucket.setUTCHours(0, 0, 0, 0);
          break;
      }
      timeBuckets.push(bucket);
    }

    // Create a map of results for easy lookup
    const resultMap = new Map<string, Map<JobState, number>>();
    results.forEach((row) => {
      const timeKey = formatDateForBucket(row.time_bucket, unit);
      if (!resultMap.has(timeKey)) {
        resultMap.set(timeKey, new Map());
      }
      resultMap.get(timeKey)!.set(row.state, row.count);
    });

    // Build the final result array with all time buckets
    return timeBuckets.map((timestamp) => {
      const timeKey = formatDateForBucket(timestamp, unit);
      const stateMap = resultMap.get(timeKey) ?? new Map<JobState, number>();

      const counts: JobCounts = {
        total: 0,
        waiting: Number(stateMap.get("waiting") ?? 0),
        claimed: Number(stateMap.get("claimed") ?? 0),
        running: Number(stateMap.get("running") ?? 0),
        completed: Number(stateMap.get("completed") ?? 0),
        failed: Number(stateMap.get("failed") ?? 0),
        canceled: Number(stateMap.get("canceled") ?? 0),
      };

      counts.total =
        counts.waiting + counts.claimed + counts.running + counts.completed + counts.failed + counts.canceled;

      return {
        timestamp,
        ...counts,
      };
    });
  }

  /**
   * Abstract method to truncate a date to a specific unit (minute, hour, day).
   * Must be implemented by subclasses to provide database-specific truncation logic.
   *
   * @param date The date string to truncate.
   * @param unit The unit to truncate to ('m' for minute, 'h' for hour, 'd' for day).
   * @returns A SQL query string that truncates the date.
   */
  abstract truncDate(date: string, unit: "m" | "h" | "d"): string;

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
          .orWhere("canceled_at", "<", cutoffDate);
      })
      .del();
  }

  async truncate() {
    logger("Backend").debug(`Truncating all job and queue tables`);
    await this.knex("sidequest_jobs").truncate();
    await this.knex("sidequest_queues").truncate();
  }
}
