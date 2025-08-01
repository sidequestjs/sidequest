/* eslint-disable @typescript-eslint/unbound-method */
import type { JobData, QueueConfig } from "@sidequest/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Backend, JobCounts, NewJobData, NewQueueData, UpdateJobData, UpdateQueueData } from "./backend";
import { BackendConfig } from "./config";
import { createBackendFromDriver } from "./factory";
import { LazyBackend } from "./lazy-backend";

// Mocks
const mockBackend: Backend = vi.hoisted(() => ({
  migrate: vi.fn().mockResolvedValue(undefined),
  rollbackMigration: vi.fn().mockResolvedValue(undefined),
  close: vi.fn().mockResolvedValue(undefined),
  createNewQueue: vi.fn().mockResolvedValue({ id: 1, name: "queue1" } as QueueConfig),
  getQueue: vi.fn().mockResolvedValue({ id: 1, name: "queue1" } as QueueConfig),
  getQueuesFromJobs: vi.fn().mockResolvedValue(["queue1", "queue2"]),
  listQueues: vi.fn().mockResolvedValue([{ id: 1, name: "queue1" }] as QueueConfig[]),
  updateQueue: vi.fn().mockResolvedValue({ id: 1, name: "queue1" } as QueueConfig),
  getJob: vi.fn().mockResolvedValue({ id: 1 } as JobData),
  createNewJob: vi.fn().mockResolvedValue({ id: 1 } as JobData),
  claimPendingJob: vi.fn().mockResolvedValue([{ id: 1 }] as JobData[]),
  updateJob: vi.fn().mockResolvedValue({ id: 1 } as JobData),
  listJobs: vi.fn().mockResolvedValue([{ id: 1 }] as JobData[]),
  countJobs: vi.fn().mockResolvedValue({ total: 1 } as JobCounts),
  countJobsOverTime: vi.fn().mockResolvedValue([{ timestamp: new Date(), total: 1 }]),
  staleJobs: vi.fn().mockResolvedValue([{ id: 1 }] as JobData[]),
  deleteFinishedJobs: vi.fn().mockResolvedValue(undefined),
  truncate: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./factory", () => ({
  createBackendFromDriver: vi.fn().mockResolvedValue(mockBackend),
}));

describe("LazyBackend", () => {
  let config: BackendConfig;
  let lazyBackend: LazyBackend;

  beforeEach(() => {
    config = { driver: "mock" } as BackendConfig;
    lazyBackend = new LazyBackend(config);
    vi.clearAllMocks();
  });

  it("should lazily initialize backend on first use", async () => {
    // @ts-expect-error Accessing private 'backend' property for testing lazy initialization behavior
    expect(lazyBackend.backend).toBeUndefined();
    await lazyBackend.migrate();
    expect(createBackendFromDriver).toHaveBeenCalledWith(config);
    // @ts-expect-error Accessing private 'backend' property for testing lazy initialization behavior
    expect(lazyBackend.backend).toBe(mockBackend);
  });

  it("should not re-initialize backend if already initialized", async () => {
    const promiseMigrate = lazyBackend.migrate();
    const promiseMigrate2 = lazyBackend.migrate();

    await promiseMigrate;
    await promiseMigrate2;

    expect(createBackendFromDriver).toHaveBeenCalledTimes(1);
  });

  it("should proxy migrate", async () => {
    await lazyBackend.migrate();
    expect(mockBackend.migrate).toHaveBeenCalled();
  });

  it("should proxy rollbackMigration", async () => {
    await lazyBackend.rollbackMigration();
    expect(mockBackend.rollbackMigration).toHaveBeenCalled();
  });

  it("should not call proxy close if not init", async () => {
    await lazyBackend.close();
    expect(mockBackend.close).not.toHaveBeenCalled();
  });

  it("should call proxy close if init", async () => {
    await lazyBackend.migrate();
    await lazyBackend.close();
    expect(mockBackend.close).toHaveBeenCalled();
  });

  it("should proxy createNewQueue", async () => {
    const queueConfig = { name: "test" } as NewQueueData;
    const result = await lazyBackend.createNewQueue(queueConfig);
    expect(mockBackend.createNewQueue).toHaveBeenCalledWith(queueConfig);
    expect(result).toEqual({ id: 1, name: "queue1" });
  });

  it("should proxy getQueue", async () => {
    const result = await lazyBackend.getQueue("queue1");
    expect(mockBackend.getQueue).toHaveBeenCalledWith("queue1");
    expect(result).toEqual({ id: 1, name: "queue1" });
  });

  it("should proxy getQueuesFromJobs", async () => {
    const result = await lazyBackend.getQueuesFromJobs();
    expect(mockBackend.getQueuesFromJobs).toHaveBeenCalled();
    expect(result).toEqual(["queue1", "queue2"]);
  });

  it("should proxy listQueues", async () => {
    const result = await lazyBackend.listQueues();
    expect(mockBackend.listQueues).toHaveBeenCalled();
    expect(result).toEqual([{ id: 1, name: "queue1" }]);
  });

  it("should proxy updateQueue", async () => {
    const queueData = { id: 1, name: "queue1" } as UpdateQueueData;
    const result = await lazyBackend.updateQueue(queueData);
    expect(mockBackend.updateQueue).toHaveBeenCalledWith(queueData);
    expect(result).toEqual({ id: 1, name: "queue1" });
  });

  it("should proxy getJob", async () => {
    const result = await lazyBackend.getJob(1);
    expect(mockBackend.getJob).toHaveBeenCalledWith(1);
    expect(result).toEqual({ id: 1 });
  });

  it("should proxy createNewJob", async () => {
    const job = { queue: "queue1" } as NewJobData;
    const result = await lazyBackend.createNewJob(job);
    expect(mockBackend.createNewJob).toHaveBeenCalledWith(job);
    expect(result).toEqual({ id: 1 });
  });

  it("should proxy claimPendingJob", async () => {
    const result = await lazyBackend.claimPendingJob("queue1", 2);
    expect(mockBackend.claimPendingJob).toHaveBeenCalledWith("queue1", 2);
    expect(result).toEqual([{ id: 1 }]);
  });

  it("should proxy updateJob", async () => {
    const job = { id: 1 } as UpdateJobData;
    const result = await lazyBackend.updateJob(job);
    expect(mockBackend.updateJob).toHaveBeenCalledWith(job);
    expect(result).toEqual({ id: 1 });
  });

  it("should proxy listJobs", async () => {
    const params = { queue: "queue1" };
    const result = await lazyBackend.listJobs(params);
    expect(mockBackend.listJobs).toHaveBeenCalledWith(params);
    expect(result).toEqual([{ id: 1 }]);
  });

  it("should proxy countJobs", async () => {
    const result = await lazyBackend.countJobs();
    expect(mockBackend.countJobs).toHaveBeenCalled();
    expect(result).toEqual({ total: 1 });
  });

  it("should proxy countJobsOverTime", async () => {
    const result = await lazyBackend.countJobsOverTime("hour");
    expect(mockBackend.countJobsOverTime).toHaveBeenCalledWith("hour");
    expect(result[0]).toHaveProperty("timestamp");
    expect(result[0]).toHaveProperty("total", 1);
  });

  it("should proxy staleJobs", async () => {
    const result = await lazyBackend.staleJobs(1000, 2000);
    expect(mockBackend.staleJobs).toHaveBeenCalledWith(1000, 2000);
    expect(result).toEqual([{ id: 1 }]);
  });

  it("should proxy deleteFinishedJobs", async () => {
    const date = new Date();
    await lazyBackend.deleteFinishedJobs(date);
    expect(mockBackend.deleteFinishedJobs).toHaveBeenCalledWith(date);
  });

  it("should proxy truncate", async () => {
    await lazyBackend.truncate();
    expect(mockBackend.truncate).toHaveBeenCalled();
  });
});
