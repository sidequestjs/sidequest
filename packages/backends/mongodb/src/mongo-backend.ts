import {
  Backend,
  JOB_FALLBACK,
  NewJobData,
  NewQueueData,
  QUEUE_FALLBACK,
  UpdateJobData,
  UpdateQueueData,
} from "@sidequest/backend";
import { JobData, JobState, QueueConfig } from "@sidequest/core";
import { Collection, Db, Filter, MongoClient } from "mongodb";

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
  }

  async insertQueueConfig(queueConfig: NewQueueData): Promise<QueueConfig> {
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

  async getQueueConfig(queue: string): Promise<QueueConfig | undefined> {
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
    if (params?.queue) filter.queue = Array.isArray(params.queue) ? { $in: params.queue } : params.queue;
    if (params?.jobClass) filter.class = Array.isArray(params.jobClass) ? { $in: params.jobClass } : params.jobClass;
    if (params?.state) filter.state = Array.isArray(params.state) ? { $in: params.state } : params.state;
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
        { cancelled_at: { $lt: cutoffDate } },
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
