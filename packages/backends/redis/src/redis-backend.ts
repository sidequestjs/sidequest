import {
  Backend,
  JOB_FALLBACK,
  MISC_FALLBACK,
  NewJobData,
  NewQueueData,
  QUEUE_FALLBACK,
  safeParseJobData,
  UpdateJobData,
  UpdateQueueData,
} from "@sidequest/backend";
import { JobData, JobState, logger, QueueConfig } from "@sidequest/core";
import Redis, { Redis as RedisClient } from "ioredis";
import { hostname } from "os";

export default class RedisBackend implements Backend {
  private client: RedisClient;

  constructor(redisUrl: string) {
    this.client = new Redis(redisUrl);

    this.client.on("connect", () => {
      logger().info("[RedisBackend] Connected to Redis at " + redisUrl);
    });

    this.client.on("error", (err) => {
      logger().error("[RedisBackend] Redis connection error:", err);
    });
  }

  async insertQueueConfig(queueConfig: NewQueueData): Promise<QueueConfig> {
    const existingId = await this.client.hget("sidequest:queue:name-to-id", queueConfig.name);
    if (existingId) {
      throw new Error(`Queue with name="${queueConfig.name}" already exists with id=${existingId}`);
    }

    const id = await this.client.incr("sidequest:queue:id");
    const data: QueueConfig = {
      id,
      ...QUEUE_FALLBACK,
      ...queueConfig,
    } as QueueConfig;

    const multi = this.client.multi();

    multi.hset("sidequest:queues", String(id), JSON.stringify(data));
    multi.hset("sidequest:queue:name-to-id", data.name, String(id));
    multi.zadd("sidequest:queues:by:priority", data.priority, String(id));
    multi.zadd("sidequest:queues:by:concurrency", data.concurrency, String(id));
    multi.zadd("sidequest:queues:by:name", 0, String(id));
    multi.zadd("sidequest:queues:by:id", data.id, String(id));
    multi.sadd("sidequest:queues:set", data.name);

    await multi.exec();
    return data;
  }

  async getQueueConfig(name: string): Promise<QueueConfig | undefined> {
    const id = await this.client.hget("sidequest:queue:name-to-id", name);
    if (!id) return undefined;

    const raw = await this.client.hget("sidequest:queues", id);
    return raw ? (JSON.parse(raw) as QueueConfig) : undefined;
  }

  async listQueues(orderBy?: { column: keyof QueueConfig; order?: "asc" | "desc" }): Promise<QueueConfig[]> {
    const column = orderBy?.column ?? "priority";
    const order = orderBy?.order ?? "desc";
    const key = `sidequest:queues:by:${column}`;

    let ids: string[];

    if (column === "name") {
      if (order === "asc") {
        ids = await this.client.zrevrangebylex(key, "+", "-");
      } else {
        ids = await this.client.zrangebylex(key, "-", "+");
      }
    } else {
      if (order === "asc") {
        ids = await this.client.zrange(key, 0, -1);
      } else {
        ids = await this.client.zrevrange(key, 0, -1);
      }
    }

    if (ids.length === 0) return [];

    const multi = this.client.multi();
    ids.forEach((id) => multi.hget("sidequest:queues", id));
    const execResult = (await multi.exec()) ?? [];
    const raws = execResult.map(([, res]) => res as string | null);

    return (raws.filter(Boolean) as string[]).map((raw) => JSON.parse(raw) as QueueConfig);
  }

  async updateQueue(queueData: UpdateQueueData): Promise<QueueConfig> {
    const raw = await this.client.hget("sidequest:queues", String(queueData.id));
    if (!raw) throw new Error(`Queue with id=${queueData.id} not found`);

    const existing = JSON.parse(raw) as QueueConfig;
    const updated: QueueConfig = {
      ...existing,
      ...queueData,
    };

    const multi = this.client.multi();
    multi.hset("sidequest:queues", String(updated.id), JSON.stringify(updated));
    multi.zadd("sidequest:queues:by:priority", updated.priority, String(updated.id));
    multi.zadd("sidequest:queues:by:concurrency", updated.concurrency, String(updated.id));
    multi.zadd("sidequest:queues:by:name", 0, String(updated.id));
    multi.zadd("sidequest:queues:by:id", updated.id, String(updated.id));

    await multi.exec();
    return updated;
  }

  async getQueuesFromJobs(): Promise<string[]> {
    return await this.client.smembers("sidequest:queues:set");
  }

  async getJob(id: number): Promise<JobData | undefined> {
    const raw = await this.client.hget("sidequest:jobs", String(id));
    return raw ? safeParseJobData(JSON.parse(raw) as JobData) : undefined;
  }

  async createNewJob(job: NewJobData): Promise<JobData> {
    const id = await this.client.incr("sidequest:job:id");
    const insertedAt = new Date();
    const availableAt = job.available_at ?? insertedAt;

    const data: JobData = {
      id,
      queue: job.queue,
      state: job.state,
      script: job.script,
      class: job.class,
      args: job.args ?? JOB_FALLBACK.args,
      constructor_args: job.constructor_args ?? JOB_FALLBACK.constructor_args,
      attempt: 0,
      max_attempts: job.max_attempts ?? JOB_FALLBACK.max_attempts!,
      inserted_at: insertedAt,
      available_at: availableAt,
      timeout: job.timeout ?? JOB_FALLBACK.timeout!,
      result: null,
      errors: null,
      attempted_at: null,
      completed_at: null,
      failed_at: null,
      cancelled_at: null,
      claimed_at: null,
      claimed_by: null,
      unique_digest: job.unique_digest ?? JOB_FALLBACK.unique_digest!,
      uniqueness_config: job.uniqueness_config ?? JOB_FALLBACK.uniqueness_config!,
    };

    const multi = this.client.multi();

    if (data.unique_digest) {
      const setnx = await this.client.setnx(`sidequest:jobs:by:unique_digest:${data.unique_digest}`, String(id));
      if (setnx === 0) {
        throw new Error(`Job with unique_digest="${data.unique_digest}" already exists`);
      }
    }

    multi.hset("sidequest:jobs", String(id), JSON.stringify(data));
    multi.sadd(`sidequest:jobs:by:queue:${data.queue}`, String(id));
    multi.sadd(`sidequest:jobs:by:state:${data.state}`, String(id));
    multi.sadd(`sidequest:jobs:by:class:${data.class}`, String(id));
    multi.zadd("sidequest:jobs:by:id", data.id, String(id));
    multi.zadd(
      `sidequest:queue:${data.queue}:jobs`,
      data.available_at ? new Date(data.available_at).getTime() : Date.now(),
      String(id),
    );
    multi.sadd("sidequest:queues:set", data.queue);

    await multi.exec();
    return safeParseJobData(data);
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
    const limit = params?.limit ?? 50;
    const offset = params?.offset ?? 0;

    // Collect sets for each filterable field (queue, jobClass, state)
    const setFilters: string[][] = [];

    if (params?.queue) {
      const queues = Array.isArray(params.queue) ? params.queue : [params.queue];
      setFilters.push(queues.map((q) => `sidequest:jobs:by:queue:${q}`));
    }
    if (params?.state) {
      const states = Array.isArray(params.state) ? params.state : [params.state];
      setFilters.push(states.map((s) => `sidequest:jobs:by:state:${s}`));
    }
    if (params?.jobClass) {
      const classes = Array.isArray(params.jobClass) ? params.jobClass : [params.jobClass];
      setFilters.push(classes.map((c) => `sidequest:jobs:by:class:${c}`));
    }

    let matched: string[] = [];

    if (setFilters.length === 0) {
      // No filters: just paginate all jobs by id
      matched = await this.client.zrevrange("sidequest:jobs:by:id", offset, offset + limit - 1);
    } else {
      // For each filter, perform a SUNION of all possible set keys (OR within a field)
      const partials: string[][] = [];
      for (const keys of setFilters) {
        if (keys.length === 1) {
          partials.push(await this.client.smembers(keys[0]));
        } else if (keys.length > 1) {
          partials.push(await this.client.sunion(...keys));
        }
      }
      // Perform intersection across all fields (AND between fields)
      if (partials.length === 1) {
        matched = partials[0];
      } else {
        // Perform intersection across all fields using Redis SINTER
        const intersectionKeys = partials.flat();
        matched = await this.client.sinter(...intersectionKeys);
      }
      // Apply offset/limit after intersection
      matched = matched.slice(offset, offset + limit);
    }

    if (matched.length === 0) return [];

    // Fetch all jobs by id
    const raws = await this.client.hmget("sidequest:jobs", ...matched);

    // Parse and apply additional in-memory filters (args, timeRange)
    return raws
      .filter(Boolean)
      .map((r) => safeParseJobData(JSON.parse(r!) as JobData))
      .filter((job) => {
        // Filter by args (exact match)
        if (params?.args && JSON.stringify(job.args) !== JSON.stringify(params.args)) {
          return false;
        }
        // Filter by attempted_at (time range)
        if (params?.timeRange && job.attempted_at) {
          const at = new Date(job.attempted_at).getTime();
          const from = params.timeRange.from?.getTime();
          const to = params.timeRange.to?.getTime();
          if ((from && at < from) || (to && at > to)) return false;
        }
        return true;
      });
  }

  async claimPendingJob(queue: string, quantity = 1): Promise<JobData[]> {
    const queueKey = `sidequest:queue:${queue}:jobs`;
    const workerName = `sidequest@${hostname()}-${process.pid}`;
    const now = Date.now();

    const luaScript = `
      local queueKey = KEYS[1]
      local jobsKey = KEYS[2]
      local waitingSetKey = KEYS[3]
      local claimedSetKey = KEYS[4]
      local workerName = ARGV[1]
      local now = tonumber(ARGV[2])
      local quantity = tonumber(ARGV[3])

      local jobIds = redis.call("zrangebyscore", queueKey, 0, now, "LIMIT", 0, quantity)
      if #jobIds == 0 then
        return {}
      end

      local claimedJobs = {}
      for i, jobId in ipairs(jobIds) do
        local jobRaw = redis.call("hget", jobsKey, jobId)
        if jobRaw then
          local job = cjson.decode(jobRaw)
          if job.state == "waiting" then
            job.state = "claimed"
            job.claimed_at = now
            job.claimed_by = workerName

            redis.call("zrem", queueKey, jobId)
            redis.call("hset", jobsKey, jobId, cjson.encode(job))
            redis.call("srem", waitingSetKey, jobId)
            redis.call("sadd", claimedSetKey, jobId)

            table.insert(claimedJobs, cjson.encode(job))
          end
        else
          redis.call("zrem", queueKey, jobId)
        end
      end

      return claimedJobs
    `;

    const claimedRawJobs = (await this.client.eval(
      luaScript,
      4,
      queueKey,
      "sidequest:jobs",
      "sidequest:jobs:by:state:waiting",
      "sidequest:jobs:by:state:claimed",
      workerName,
      now,
      quantity,
    )) as string[];

    return claimedRawJobs.map((raw: string) => safeParseJobData(JSON.parse(raw) as JobData));
  }

  async updateJob(job: UpdateJobData): Promise<JobData> {
    const raw = await this.client.hget("sidequest:jobs", String(job.id));
    if (!raw) throw new Error(`Job with id=${job.id} not found`);

    const existing = JSON.parse(raw) as JobData;
    const updated: JobData = {
      ...existing,
      ...job,
      completed_at: job.completed_at ?? existing.completed_at,
      failed_at: job.failed_at ?? existing.failed_at,
      cancelled_at: job.cancelled_at ?? existing.cancelled_at,
    };

    const multi = this.client.multi();
    multi.hset("sidequest:jobs", String(updated.id), JSON.stringify(updated));

    if (job.state && job.state !== existing.state) {
      multi.srem(`sidequest:jobs:by:state:${existing.state}`, String(updated.id));
      multi.sadd(`sidequest:jobs:by:state:${job.state}`, String(updated.id));
      if (job.state === "waiting") {
        const score = updated.available_at ? new Date(updated.available_at).getTime() : Date.now();
        multi.zadd(`sidequest:queue:${updated.queue}:jobs`, score, String(updated.id));
      }
      if (["completed", "failed", "canceled"].includes(job.state) && updated.unique_digest) {
        multi.del(`sidequest:jobs:by:unique_digest:${updated.unique_digest}`);
      }
    }
    if (job.queue && job.queue !== existing.queue) {
      multi.srem(`sidequest:jobs:by:queue:${existing.queue}`, String(updated.id));
      multi.sadd(`sidequest:jobs:by:queue:${job.queue}`, String(updated.id));
      multi.sadd("sidequest:queues:set", job.queue);
    }
    if (job.class && job.class !== existing.class) {
      multi.srem(`sidequest:jobs:by:class:${existing.class}`, String(updated.id));
      multi.sadd(`sidequest:jobs:by:class:${job.class}`, String(updated.id));
    }

    await multi.exec();
    return safeParseJobData(updated);
  }

  async staleJobs(
    maxStaleMs = MISC_FALLBACK.maxStaleMs,
    maxClaimedMs = MISC_FALLBACK.maxClaimedMs,
  ): Promise<JobData[]> {
    const now = Date.now();
    const [claimedIds, runningIds] = await Promise.all([
      this.client.smembers("sidequest:jobs:by:state:claimed"),
      this.client.smembers("sidequest:jobs:by:state:running"),
    ]);
    const all = [...claimedIds, ...runningIds];
    if (!all.length) return [];

    const raws = await this.client.hmget("sidequest:jobs", ...all);
    const stale: JobData[] = [];
    raws.forEach((r) => {
      if (!r) return;
      const job = JSON.parse(r) as JobData;
      if (job.state === "claimed" && job.claimed_at && now - new Date(job.claimed_at).getTime() > maxClaimedMs) {
        stale.push(job);
      }
      if (
        job.state === "running" &&
        job.attempted_at &&
        now - new Date(job.attempted_at).getTime() > (job.timeout ?? maxStaleMs)
      ) {
        stale.push(job);
      }
    });
    return stale.map(safeParseJobData);
  }

  async deleteFinishedJobs(cutoffDate: Date): Promise<void> {
    const cutoffTs = cutoffDate.getTime();
    const states = ["completed", "failed", "canceled"];
    const ids = (await Promise.all(states.map((s) => this.client.smembers(`sidequest:jobs:by:state:${s}`)))).flat();
    if (!ids.length) return;

    const raws = await this.client.hmget("sidequest:jobs", ...ids);
    const multi = this.client.multi();

    raws.forEach((r) => {
      if (!r) return;
      const job = JSON.parse(r) as JobData;
      const finishedAt = job.completed_at ?? job.failed_at ?? job.cancelled_at;
      if (finishedAt && new Date(finishedAt).getTime() < cutoffTs) {
        const id = String(job.id);
        multi.hdel("sidequest:jobs", id);
        multi.zrem("sidequest:jobs:by:id", id);
        states.forEach((s) => multi.srem(`sidequest:jobs:by:state:${s}`, id));
        multi.srem(`sidequest:jobs:by:queue:${job.queue}`, id);
        multi.srem(`sidequest:jobs:by:class:${job.class}`, id);
        if (job.unique_digest) {
          multi.del(`sidequest:jobs:by:unique_digest:${job.unique_digest}`);
        }
      }
    });

    await multi.exec();
  }

  async truncate(): Promise<void> {
    logger().warn("[RedisBackend] Truncating entire Redis database…");
    await this.client.flushdb();
    logger().info("[RedisBackend] Redis database truncated.");
  }

  migrate(): Promise<void> {
    logger().debug("[RedisBackend] No migrations required for Redis backend.");
    return Promise.resolve();
  }

  rollbackMigration(): Promise<void> {
    logger().debug("[RedisBackend] No rollback actions available for Redis backend.");
    return Promise.resolve();
  }

  async close(): Promise<void> {
    logger().debug("[RedisBackend] Closing Redis connection...");
    await this.client.quit();
    logger().info("[RedisBackend] Redis connection closed.");
  }
}
