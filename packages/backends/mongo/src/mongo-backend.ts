import {
  Backend,
  formatDateForBucket,
  JOB_FALLBACK,
  JobCounts,
  NewJobData,
  NewQueueData,
  QUEUE_FALLBACK,
  UpdateJobData,
  UpdateQueueData,
} from "@sidequest/backend";
import { JobData, JobState, QueueConfig } from "@sidequest/core";
import { Collection, Db, Filter, MongoClient } from "mongodb";
import { addCoalescedField, generateTimeBuckets, getTimeRangeConfig, matchDateRange, parseTimeRange } from "./utils";

/**
 * Converts SQL ILIKE pattern to MongoDB regex pattern.
 * Handles % wildcards.
 */
function convertILikeToRegex(pattern: string): RegExp {
  // Convert % to .*
  const regexPattern = pattern.replace(/%/g, ".*");
  // Return case-insensitive regex
  return new RegExp(`^${regexPattern}$`, "i");
}

/**
 * Creates a MongoDB filter condition that mimics SQL's whereOrWhereIn behavior.
 * Single values are treated as ILIKE patterns, arrays as $in conditions.
 */
function createFilter<T>(value: T | T[]): T | { $in: T[] } | { $regex: RegExp } {
  if (Array.isArray(value)) {
    return { $in: value };
  } else if (typeof value === "string") {
    return { $regex: convertILikeToRegex(value) };
  } else {
    return value;
  }
}

export default class MongoBackend implements Backend {
  private client: MongoClient;
  private db: Db;
  private jobs: Collection<JobData>;
  private queues: Collection<QueueConfig>;
  private counters: Collection<{ _id: string; seq: number }>;
  private _connected: boolean;

  constructor(mongoUrl: string) {
    const url = new URL(mongoUrl);
    const dbName = url.pathname && url.pathname !== "/" ? url.pathname.replace(/^\//, "") : "test";
    this.client = new MongoClient(mongoUrl, { ignoreUndefined: true });
    this.db = this.client.db(dbName);
    this.jobs = this.db.collection<JobData>("sidequest_jobs");
    this.queues = this.db.collection<QueueConfig>("sidequest_queues");
    this.counters = this.db.collection("sidequest_counters");
    this._connected = false;
  }

  private async nextId(key: string): Promise<number> {
    const result = await this.counters.findOneAndUpdate(
      { _id: key },
      { $inc: { seq: 1 } },
      { upsert: true, returnDocument: "after" },
    );
    return result!.seq;
  }

  private async ensureConnected() {
    if (!this._connected) {
      await this.client.connect();
      this._connected = true;
    }
  }

  async migrate(): Promise<void> {
    await this.ensureConnected();
    await this.jobs.createIndex({ queue: 1, state: 1, available_at: 1 });
    await this.jobs.createIndex(
      { unique_digest: 1 },
      {
        unique: true,
        partialFilterExpression: {
          unique_digest: { $exists: true, $type: "string" },
        },
      },
    );
    await this.queues.createIndex({ name: 1 }, { unique: true });
  }

  async rollbackMigration(): Promise<void> {
    return Promise.resolve();
  }

  async close(): Promise<void> {
    await this.client.close();
    this._connected = false;
  }

  async createNewQueue(queueConfig: NewQueueData): Promise<QueueConfig> {
    if (queueConfig.concurrency !== undefined && queueConfig.concurrency < 1) {
      throw new Error("Concurrency must be at least 1");
    }

    await this.ensureConnected();
    const id = await this.nextId("queue");
    const doc: QueueConfig = {
      ...QUEUE_FALLBACK,
      ...queueConfig,
      id,
      name: queueConfig.name,
    };
    await this.queues.insertOne(doc);
    return doc;
  }

  async getQueue(queue: string): Promise<QueueConfig | undefined> {
    await this.ensureConnected();
    return (await this.queues.findOne({ name: queue })) as QueueConfig | undefined;
  }

  async getQueuesFromJobs(): Promise<string[]> {
    await this.ensureConnected();
    const queues = await this.jobs.distinct("queue");
    return queues;
  }

  async listQueues(orderBy?: { column: keyof QueueConfig; order?: "asc" | "desc" }): Promise<QueueConfig[]> {
    await this.ensureConnected();
    const sort: Record<string, 1 | -1> = {};
    sort[orderBy?.column ?? "priority"] = (orderBy?.order ?? "desc") === "asc" ? 1 : -1;
    return await this.queues.find().sort(sort).toArray();
  }

  async updateQueue(queueData: UpdateQueueData): Promise<QueueConfig> {
    if (queueData.concurrency !== undefined && queueData.concurrency < 1) {
      throw new Error("Concurrency must be at least 1");
    }

    await this.ensureConnected();
    const { id, ...updates } = queueData;
    const res = await this.queues.findOneAndUpdate({ id }, { $set: updates }, { returnDocument: "after" });
    if (!res) throw new Error("Queue not found");
    return res as QueueConfig;
  }

  async createNewJob(job: NewJobData): Promise<JobData> {
    await this.ensureConnected();
    const id = await this.nextId("job");
    const now = new Date();
    const doc: JobData = {
      ...JOB_FALLBACK,
      ...job,
      id,
      inserted_at: now,
      available_at: job.available_at ?? now,
    };
    await this.jobs.insertOne(doc);
    return doc;
  }

  async getJob(id: number): Promise<JobData | undefined> {
    await this.ensureConnected();
    const job = (await this.jobs.findOne({ id })) as JobData | undefined;
    if (job) return job;
  }

  async claimPendingJob(queue: string, quantity = 1): Promise<JobData[]> {
    await this.ensureConnected();
    const now = new Date();
    const claimed: JobData[] = [];
    for (let i = 0; i < quantity; i++) {
      const res = await this.jobs.findOneAndUpdate(
        {
          queue,
          state: "waiting",
          available_at: { $lte: now },
        },
        {
          $set: {
            state: "claimed",
            claimed_at: now,
            claimed_by: `sidequest@${process.pid}`,
          },
        },
        { returnDocument: "after", sort: { inserted_at: 1, id: 1 } },
      );
      if (res) claimed.push(res as JobData);
      else break;
    }
    return claimed;
  }

  async updateJob(job: UpdateJobData): Promise<JobData> {
    await this.ensureConnected();
    const { id, ...updates } = job;
    const res = await this.jobs.findOneAndUpdate({ id }, { $set: updates }, { returnDocument: "after" });
    if (!res) throw new Error("Job not found");
    return res as JobData;
  }

  async listJobs(params?: {
    queue?: string | string[];
    jobClass?: string | string[];
    state?: JobState | JobState[];
    limit?: number;
    offset?: number;
    args?: unknown[];
    timeRange?: { from?: Date; to?: Date };
  }): Promise<JobData[]> {
    await this.ensureConnected();
    const filter: Filter<JobData> = {};
    if (params?.queue) filter.queue = createFilter(params.queue);
    if (params?.jobClass) filter.class = createFilter(params.jobClass);
    if (params?.state) filter.state = createFilter(params.state);
    if (params?.args) filter.args = params.args;
    if (params?.timeRange?.from || params?.timeRange?.to) {
      filter.attempted_at = {};
      if (params.timeRange.from) filter.attempted_at.$gte = params.timeRange.from;
      if (params.timeRange.to) filter.attempted_at.$lte = params.timeRange.to;
    }
    const limit = params?.limit ?? 50;
    const offset = params?.offset ?? 0;
    return await this.jobs.find(filter).sort({ id: -1 }).skip(offset).limit(limit).toArray();
  }

  async countJobs(timeRange?: { from?: Date; to?: Date }): Promise<JobCounts> {
    await this.ensureConnected();

    const pipeline: object[] = [];

    // If timeRange is specified, add computed timestamp field and match stage
    if (timeRange?.from || timeRange?.to) {
      // Add computed field for the relevant timestamp (first non-null value)
      pipeline.push(
        addCoalescedField(
          "timestamp",
          "completed_at",
          "failed_at",
          "canceled_at",
          "attempted_at",
          "claimed_at",
          "inserted_at",
        ),
      );

      // Apply time range filter to the computed timestamp
      const matchStage = matchDateRange("timestamp", timeRange);
      if (matchStage) pipeline.push(matchStage);
    }

    // Group by state and count
    pipeline.push({
      $group: {
        _id: "$state",
        count: { $sum: 1 },
      },
    });

    const results = (await this.jobs.aggregate(pipeline).toArray()) as { _id: JobState; count: number }[];

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
      const count = row.count;
      counts[row._id] = count;
      counts.total += count;
    });

    return counts;
  }

  async countJobsOverTime(timeRange: string): Promise<({ timestamp: Date } & JobCounts)[]> {
    await this.ensureConnected();

    const { amount, unit } = parseTimeRange(timeRange);

    const { intervalMs, granularityMs, dateGrouping } = getTimeRangeConfig(amount, unit);

    const now = new Date();
    const startTime = new Date(now.getTime() - intervalMs);

    const pipeline = [
      // Add a "timestamp" field using the first non-null value among the given columns
      addCoalescedField(
        "timestamp",
        "completed_at",
        "failed_at",
        "canceled_at",
        "attempted_at",
        "claimed_at",
        "inserted_at",
      ),

      // Filter documents so only those within the desired timestamp range are included
      {
        $match: {
          timestamp: {
            $gte: startTime,
            $lte: now,
          },
        },
      },

      // Group by both time bucket (dateGrouping) and state,
      // counting how many documents are in each combination
      {
        $group: {
          _id: {
            timeBucket: dateGrouping, // e.g., group by hour, day, etc.
            state: "$state",
          },
          count: { $sum: 1 }, // count documents per group
        },
      },

      // Regroup by just time bucket,
      // collecting all states/counts for each time interval into an array
      {
        $group: {
          _id: "$_id.timeBucket", // now just by time bucket
          states: {
            $push: {
              state: "$_id.state", // push the state
              count: "$count", // and its count
            },
          },
        },
      },

      // Sort the results by time bucket (ascending)
      {
        $sort: { _id: 1 },
      },
    ];

    interface AggregationResult {
      _id: {
        year: number;
        month: number;
        day: number;
        hour?: number;
        minute?: number;
      };
      states: {
        state: JobState;
        count: number;
      }[];
    }

    const results = (await this.jobs.aggregate(pipeline).toArray()) as AggregationResult[];

    // Generate all time buckets in the range
    const timeBuckets = generateTimeBuckets(startTime, now, granularityMs, unit);

    // Create a map of results for easy lookup
    const resultMap = new Map<string, Map<JobState, number>>();
    results.forEach((row) => {
      // Reconstruct the date from the grouped components
      const { year, month, day, hour = 0, minute = 0 } = row._id;
      const date = new Date(Date.UTC(year, month - 1, day, hour, minute));
      const timeKey = formatDateForBucket(date, unit);

      if (!resultMap.has(timeKey)) {
        resultMap.set(timeKey, new Map());
      }

      row.states.forEach((stateData) => {
        resultMap.get(timeKey)!.set(stateData.state, stateData.count);
      });
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

  async staleJobs(maxStaleMs = 60_000, maxClaimedMs = 5 * 60_000): Promise<JobData[]> {
    await this.ensureConnected();
    const now = Date.now();
    const runningJobs = await this.jobs
      .find({
        state: "running",
        attempted_at: { $lt: new Date(now - maxStaleMs) },
      })
      .toArray();
    const claimedJobs = await this.jobs
      .find({
        state: "claimed",
        claimed_at: { $lt: new Date(now - maxClaimedMs) },
      })
      .toArray();
    return [...runningJobs, ...claimedJobs];
  }

  async deleteFinishedJobs(cutoffDate: Date): Promise<void> {
    await this.ensureConnected();
    await this.jobs.deleteMany({
      $or: [
        { completed_at: { $lt: cutoffDate } },
        { failed_at: { $lt: cutoffDate } },
        { canceled_at: { $lt: cutoffDate } },
      ],
    });
  }

  async truncate(): Promise<void> {
    await this.ensureConnected();
    await this.jobs.deleteMany({});
    await this.queues.deleteMany({});
    await this.counters.deleteMany({});
  }
}
