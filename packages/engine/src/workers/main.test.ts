import { sidequestTest, SidequestTestFixture } from "@/tests/fixture";
import { NewQueueData } from "@sidequest/backend";
import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, vi } from "vitest";
import { Dispatcher } from "../execution/dispatcher";
import { grantQueueConfig } from "../queue";
import { MainWorker } from "./main";

const runMock = vi.hoisted(() => vi.fn());

vi.mock("../shared-runner", () => ({
  RunnerPool: vi.fn(function () {
    return {
      run: runMock,
      destroy: vi.fn(),
    };
  }),
}));

const cronMocks = vi.hoisted(() => ({
  schedule: vi.fn().mockReturnValue({ execute: vi.fn(), stop: vi.fn() }),
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
    // resetAllMocks clears the return value, so re-establish the scheduled-task shape used by
    // WorkerRuntime (which calls task.stop() on shutdown).
    cronMocks.schedule.mockReturnValue({ execute: vi.fn(), stop: vi.fn() });
  });

  afterEach(async () => {
    await worker.shutdown();
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
