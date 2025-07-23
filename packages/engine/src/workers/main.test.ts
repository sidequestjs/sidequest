import { NewQueueData } from "@sidequest/backend";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Engine, SidequestConfig } from "../engine";
import { Dispatcher } from "../execution/dispatcher";
import { cleanupFinishedJobs } from "../routines/cleanup-finished-job";
import { releaseStaleJobs } from "../routines/release-stale-jobs";
import { runWorker, startCron } from "./main";

const runMock = vi.fn();

vi.mock("../shared-runner", () => ({
  RunnerPool: vi.fn().mockImplementation(() => ({
    run: runMock,
  })),
}));

const cronMocks = vi.hoisted(() => ({
  schedule: vi.fn().mockReturnValue({ execute: vi.fn() }),
}));

vi.mock("node-cron", () => ({
  default: {
    schedule: cronMocks.schedule,
  },
}));

vi.mock("../routines/cleanup-finished-job", () => ({
  cleanupFinishedJobs: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../routines/release-stale-jobs", () => ({
  releaseStaleJobs: vi.fn().mockResolvedValue(undefined),
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
    it("should schedule both cron jobs", () => {
      startCron();

      expect(cronMocks.schedule).toHaveBeenCalledTimes(2);
      expect(cronMocks.schedule).toHaveBeenCalledWith("0 * * * *", expect.any(Function));
    });

    it("should call releaseStaleJobs when release cron executes", async () => {
      startCron();

      const cronCallback = cronMocks.schedule.mock.calls[0][1] as () => unknown;

      await cronCallback();

      expect(releaseStaleJobs).toHaveBeenCalledWith(Engine.getBackend());
    });

    it("should call cleanupFinishedJobs when cleanup cron executes", async () => {
      startCron();

      const cronCallback = cronMocks.schedule.mock.calls[1][1] as () => unknown;

      await cronCallback();

      expect(cleanupFinishedJobs).toHaveBeenCalledWith(Engine.getBackend());
    });

    it("should handle errors and log them when releaseStaleJobs fails", async () => {
      const error = new Error("fail");
      (releaseStaleJobs as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

      startCron();

      const cronCallback = cronMocks.schedule.mock.calls[0][1] as () => unknown;

      await expect(cronCallback()).resolves.toBeUndefined();
      expect(releaseStaleJobs).toHaveBeenCalled();
    });
  });

  describe("runWorker", () => {
    it("should call startCron after starting the worker", async () => {
      const mockWorkerRun = vi.fn().mockResolvedValue(undefined);

      const WorkerSpy = vi.spyOn(Dispatcher.prototype, "start").mockImplementation(mockWorkerRun);

      await runWorker(config);

      expect(WorkerSpy).toHaveBeenCalled();
      expect(cronMocks.schedule).toHaveBeenCalledTimes(2);
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
