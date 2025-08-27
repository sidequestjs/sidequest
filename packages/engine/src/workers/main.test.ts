import { sidequestTest, SidequestTestFixture } from "@/tests/fixture";
import { NewQueueData } from "@sidequest/backend";
import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, vi } from "vitest";
import { Dispatcher } from "../execution/dispatcher";
import { grantQueueConfig } from "../queue";
import { cleanupFinishedJobs } from "../routines/cleanup-finished-job";
import { releaseStaleJobs } from "../routines/release-stale-jobs";
import { MainWorker } from "./main";

const runMock = vi.hoisted(() => vi.fn());

vi.mock("../shared-runner", () => ({
  RunnerPool: vi.fn(() => ({
    run: runMock,
    destroy: vi.fn(),
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
  cleanupFinishedJobs: vi.fn(() => undefined),
}));

vi.mock("../routines/release-stale-jobs", () => ({
  releaseStaleJobs: vi.fn(() => undefined),
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

  let worker: MainWorker;

  beforeEach<SidequestTestFixture>(async ({ backend, config }) => {
    await backend.migrate();
    worker = new MainWorker();
    for (const queue of queues) {
      await grantQueueConfig(backend, queue);
    }
    await worker.runWorker(config);
    vi.resetAllMocks();
  });

  afterEach(async () => {
    await worker.shutdown();
  });

  describe("startCron", () => {
    sidequestTest("should schedule both cron jobs", async () => {
      await worker.startCron(60, 600_000, 60_000, 60, 0);

      expect(cronMocks.schedule).toHaveBeenCalledTimes(2);
      expect(cronMocks.schedule).toHaveBeenCalledWith("*/60 * * * *", expect.any(Function));
    });

    sidequestTest("should call releaseStaleJobs when release cron executes", async () => {
      await worker.startCron(60, 600_000, 60_000, 60, 0);

      const cronCallback = cronMocks.schedule.mock.calls[0][1] as () => unknown;

      await cronCallback();

      expect(releaseStaleJobs).toHaveBeenCalledWith(expect.any(Object), 600_000, 60_000);
    });

    sidequestTest("should call cleanupFinishedJobs when cleanup cron executes", async () => {
      await worker.startCron(60, 600_000, 60_000, 60, 0);

      const cronCallback = cronMocks.schedule.mock.calls[1][1] as () => unknown;

      await cronCallback();

      expect(cleanupFinishedJobs).toHaveBeenCalledWith(expect.any(Object), 0);
    });

    sidequestTest("should handle errors and log them when releaseStaleJobs fails", async () => {
      const error = new Error("fail");
      (releaseStaleJobs as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

      await worker.startCron(60, 600_000, 60_000, 60, 0);

      const cronCallback = cronMocks.schedule.mock.calls[0][1] as () => unknown;

      await expect(cronCallback()).resolves.toBeUndefined();
      expect(releaseStaleJobs).toHaveBeenCalled();
    });
  });

  describe("runWorker", () => {
    sidequestTest("should call startCron after starting the worker", async ({ config }) => {
      const mockWorkerRun = vi.fn().mockResolvedValueOnce(undefined);

      const WorkerSpy = vi.spyOn(Dispatcher.prototype, "start").mockImplementationOnce(mockWorkerRun);

      await worker.runWorker(config);

      expect(WorkerSpy).toHaveBeenCalled();
      expect(cronMocks.schedule).toHaveBeenCalledTimes(2);
    });

    sidequestTest("should handle errors and exit process", async ({ config }) => {
      const mockExit = vi.spyOn(process, "exit").mockImplementationOnce(() => {
        throw new Error("process.exit called");
      });

      const testError = new Error("Worker failed");

      const mockWorkerRun = () => {
        throw testError;
      };
      vi.spyOn(Dispatcher.prototype, "start").mockImplementationOnce(mockWorkerRun);

      try {
        await worker.runWorker(config);
      } catch (error) {
        expect((error as Error).message).toBe("process.exit called");
      }

      expect(mockExit).toHaveBeenCalledWith(1);
      expect(cronMocks.schedule).not.toHaveBeenCalled();

      mockExit.mockRestore();
    });
  });
});
