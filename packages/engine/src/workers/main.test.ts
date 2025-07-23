import { NewQueueData } from "@sidequest/backend";
import { DuplicatedJobError, JobData } from "@sidequest/core";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Engine, JobClassType, SidequestConfig } from "../engine";
import { Dispatcher } from "../execution/dispatcher";
import { CleanupFinishedJobs } from "../internal-jobs/cleanup-finished-job";
import { ReleaseStaleJob } from "../internal-jobs/release-stale-jobs";
import { JobBuilder } from "../job/job-builder";
import { runWorker, startCron } from "./main";

const cronMocks = vi.hoisted(() => ({
  schedule: vi.fn().mockReturnValue({ execute: vi.fn() }),
}));

vi.mock("node-cron", () => ({
  default: {
    schedule: cronMocks.schedule,
  },
}));

describe("main.ts", () => {
  const highQueueName = `high-${randomUUID()}`;
  const mediumQueueName = `medium-${randomUUID()}`;
  const lowQueueName = `low-${randomUUID()}`;
  const singleQueueName = `single-${randomUUID()}`;

  const queues: NewQueueData[] = [
    { name: highQueueName, priority: 10 },
    { name: mediumQueueName, priority: 5 },
    { name: lowQueueName },
    { name: singleQueueName, concurrency: 1 },
  ];

  const dbLocation = ":memory:";
  const config: SidequestConfig = { queues, backend: { driver: "@sidequest/sqlite-backend", config: dbLocation } };

  beforeAll(async () => {
    await Engine.configure(config);
  });

  afterAll(async () => {
    await Engine.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("startCron", () => {
    it("should schedule a cron job to run every 5 minutes", () => {
      startCron(config);

      expect(cronMocks.schedule).toHaveBeenCalledWith("*/5 * * * *", expect.any(Function));
    });

    it("should enqueue ReleaseStaleJob when cron job executes", async () => {
      const mockEnqueue = vi.fn().mockResolvedValue(undefined);
      const mockTimeout = vi.fn().mockReturnValue({ enqueue: mockEnqueue });
      const mockUnique = vi.fn().mockReturnValue({ timeout: mockTimeout });
      const mockQueue = vi.fn().mockReturnValue({ unique: mockUnique });
      const mockWith = vi.fn().mockReturnValue({ queue: mockQueue });
      const mockBuild = vi
        .spyOn(Engine, "build")
        .mockReturnValue({ with: mockWith } as unknown as JobBuilder<JobClassType>);

      startCron(config);

      const cronCallback = cronMocks.schedule.mock.calls[0][1] as () => unknown;

      await cronCallback();

      expect(mockBuild).toHaveBeenCalledWith(ReleaseStaleJob);
      expect(mockQueue).toHaveBeenCalledWith("sidequest_internal");
      expect(mockUnique).toHaveBeenCalledWith({ period: "second" });
      expect(mockTimeout).toHaveBeenCalledWith(10_000);
      expect(mockEnqueue).toHaveBeenCalled();
    });

    it("should enqueue CleanupFinishedJobs when cron job executes", async () => {
      const mockEnqueue = vi.fn().mockResolvedValue(undefined);
      const mockTimeout = vi.fn().mockReturnValue({ enqueue: mockEnqueue });
      const mockUnique = vi.fn().mockReturnValue({ timeout: mockTimeout });
      const mockQueue = vi.fn().mockReturnValue({ unique: mockUnique });
      const mockWith = vi.fn().mockReturnValue({ queue: mockQueue });
      const mockBuild = vi
        .spyOn(Engine, "build")
        .mockReturnValue({ with: mockWith } as unknown as JobBuilder<JobClassType>);

      startCron(config);

      const cronCallback = cronMocks.schedule.mock.calls[1][1] as () => unknown;

      await cronCallback();

      expect(mockBuild).toHaveBeenCalledWith(CleanupFinishedJobs);
      expect(mockQueue).toHaveBeenCalledWith("sidequest_internal");
      expect(mockUnique).toHaveBeenCalledWith({ period: "hour" });
      expect(mockTimeout).toHaveBeenCalledWith(10_000);
      expect(mockEnqueue).toHaveBeenCalled();
    });

    it("should handle DuplicatedJobError gracefully", async () => {
      const mockEnqueue = vi.fn().mockRejectedValue(
        new DuplicatedJobError({
          class: "class",
          constructor_args: [],
          state: "waiting",
          args: [],
          queue: "default",
          script: "",
          attempt: 1,
          max_attempts: 5,
        } as unknown as JobData),
      );
      const mockTimeout = vi.fn().mockReturnValue({ enqueue: mockEnqueue });
      const mockUnique = vi.fn().mockReturnValue({ timeout: mockTimeout });
      const mockQueue = vi.fn().mockReturnValue({ unique: mockUnique });
      const mockWith = vi.fn().mockReturnValue({ queue: mockQueue });
      vi.spyOn(Engine, "build").mockReturnValue({ with: mockWith } as unknown as JobBuilder<JobClassType>);

      startCron(config);

      const cronCallback = cronMocks.schedule.mock.calls[0][1] as () => unknown;

      await expect(cronCallback()).resolves.toBeUndefined();
    });

    it("should handle other errors and log them", async () => {
      const testError = new Error("Test error");

      const mockEnqueue = vi.fn().mockRejectedValue(testError);
      const mockTimeout = vi.fn().mockReturnValue({ enqueue: mockEnqueue });
      const mockUnique = vi.fn().mockReturnValue({ timeout: mockTimeout });
      const mockQueue = vi.fn().mockReturnValue({ unique: mockUnique });
      const mockWith = vi.fn().mockReturnValue({ queue: mockQueue });
      vi.spyOn(Engine, "build").mockReturnValue({ with: mockWith } as unknown as JobBuilder<JobClassType>);

      startCron(config);

      const cronCallback = cronMocks.schedule.mock.calls[0][1] as () => unknown;

      await expect(cronCallback()).resolves.toBeUndefined();
    });
  });

  describe("runWorker", () => {
    it("should call startCron after starting the worker", async () => {
      const mockWorkerRun = vi.fn().mockResolvedValue(undefined);

      const WorkerSpy = vi.spyOn(Dispatcher.prototype, "start").mockImplementation(mockWorkerRun);

      await runWorker(config);

      expect(WorkerSpy).toHaveBeenCalled();
      expect(cronMocks.schedule).toHaveBeenCalledWith("*/5 * * * *", expect.any(Function));
    });

    it("should handle errors and exit process", async () => {
      const mockExit = vi.spyOn(process, "exit").mockImplementation(() => {
        throw new Error("process.exit called");
      });

      const testError = new Error("Worker failed");

      const mockWorkerRun = () => {
        throw testError;
      };
      vi.spyOn(Dispatcher.prototype, "start").mockImplementation(mockWorkerRun);

      try {
        await runWorker(config);
      } catch (error) {
        expect((error as Error).message).toBe("process.exit called");
      }

      expect(mockExit).toHaveBeenCalledWith(1);
      expect(cronMocks.schedule).not.toHaveBeenCalled();

      mockExit.mockRestore();
    });
  });
});
