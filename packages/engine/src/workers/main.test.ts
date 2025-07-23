import { CompleteTransition, DuplicatedJobError, QueueConfig } from "@sidequest/core";
import { randomUUID } from "node:crypto";
import { unlink } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Engine, JobClassType, SidequestConfig } from "../engine";
import { JobBuilder } from "../job/job-builder";
import { JobTransitioner } from "../job/job-transitioner";
import { DummyJob } from "../test-jobs/dummy-job";
import { Worker, runWorker, startCron } from "./main";

const fakeChild = vi.hoisted(() => ({
  on: vi.fn(),
  send: vi.fn(),
  kill: vi.fn(),
}));

const mocks = vi.hoisted(() => ({
  fork: vi.fn(() => fakeChild),
}));

const cronMocks = vi.hoisted(() => ({
  schedule: vi.fn(),
}));

vi.mock("child_process", () => ({
  fork: mocks.fork,
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

  const queues: Record<string, QueueConfig> = {
    [highQueueName]: { queue: highQueueName, priority: 10 },
    [mediumQueueName]: { queue: mediumQueueName, priority: 5 },
    [lowQueueName]: { queue: lowQueueName },
    [singleQueueName]: { queue: singleQueueName, concurrency: 1 },
  };

  const dbLocation = "./sidequest-test.sqlite";
  const config: SidequestConfig = { queues, backend: { driver: "@sidequest/sqlite-backend", config: dbLocation } };

  beforeAll(async () => {
    await Engine.configure(config);
  });

  afterAll(async () => {
    await Engine.close();
    unlink(dbLocation, () => {
      // noop
    });
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("runs the worker", async () => {
    const worker = new Worker();
    await worker.run(config);
    const jobData = await new JobBuilder(DummyJob).enqueue();

    mocks.fork.mockImplementation(() => {
      void JobTransitioner.apply(jobData, new CompleteTransition());
      return fakeChild;
    });

    if (jobData.id) {
      await vi.waitUntil(async () => {
        const job = await Engine.getBackend()!.getJob(jobData.id!);
        return job.state === "completed";
      });
    }

    worker.stop();
  });

  describe("startCron", () => {
    it("should schedule a cron job to run every 5 minutes", () => {
      startCron();

      expect(cronMocks.schedule).toHaveBeenCalledWith("*/5 * * * *", expect.any(Function));
    });

    it("should enqueue ReleaseStaleJob when cron job executes", async () => {
      const mockEnqueue = vi.fn().mockResolvedValue(undefined);
      const mockTimeout = vi.fn().mockReturnValue({ enqueue: mockEnqueue });
      const mockUnique = vi.fn().mockReturnValue({ timeout: mockTimeout });
      const mockQueue = vi.fn().mockReturnValue({ unique: mockUnique });
      const mockBuild = vi
        .spyOn(Engine, "build")
        .mockReturnValue({ queue: mockQueue } as unknown as JobBuilder<JobClassType>);

      startCron();

      const cronCallback = cronMocks.schedule.mock.calls[0][1] as () => unknown;

      await cronCallback();

      expect(mockBuild).toHaveBeenCalled();
      expect(mockQueue).toHaveBeenCalledWith("sidequest_internal");
      expect(mockUnique).toHaveBeenCalledWith(true);
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
        }),
      );
      const mockTimeout = vi.fn().mockReturnValue({ enqueue: mockEnqueue });
      const mockUnique = vi.fn().mockReturnValue({ timeout: mockTimeout });
      const mockQueue = vi.fn().mockReturnValue({ unique: mockUnique });
      vi.spyOn(Engine, "build").mockReturnValue({ queue: mockQueue } as unknown as JobBuilder<JobClassType>);

      startCron();

      const cronCallback = cronMocks.schedule.mock.calls[0][1] as () => unknown;

      await expect(cronCallback()).resolves.toBeUndefined();
    });

    it("should handle other errors and log them", async () => {
      const testError = new Error("Test error");

      const mockEnqueue = vi.fn().mockRejectedValue(testError);
      const mockTimeout = vi.fn().mockReturnValue({ enqueue: mockEnqueue });
      const mockUnique = vi.fn().mockReturnValue({ timeout: mockTimeout });
      const mockQueue = vi.fn().mockReturnValue({ unique: mockUnique });
      vi.spyOn(Engine, "build").mockReturnValue({ queue: mockQueue } as unknown as JobBuilder<JobClassType>);

      startCron();

      const cronCallback = cronMocks.schedule.mock.calls[0][1] as () => unknown;

      await expect(cronCallback()).resolves.toBeUndefined();
    });
  });

  describe("runWorker", () => {
    it("should call startCron after starting the worker", async () => {
      const mockWorkerRun = vi.fn().mockResolvedValue(undefined);

      const WorkerSpy = vi.spyOn(Worker.prototype, "run").mockImplementation(mockWorkerRun);

      await runWorker(config);

      expect(WorkerSpy).toHaveBeenCalledWith(config);
      expect(cronMocks.schedule).toHaveBeenCalledWith("*/5 * * * *", expect.any(Function));
    });

    it("should handle errors and exit process", async () => {
      const mockExit = vi.spyOn(process, "exit").mockImplementation(() => {
        throw new Error("process.exit called");
      });

      const testError = new Error("Worker failed");

      const mockWorkerRun = vi.fn().mockRejectedValue(testError);
      vi.spyOn(Worker.prototype, "run").mockImplementation(mockWorkerRun);

      try {
        await runWorker(config);
      } catch (error) {
        expect((error as Error).message).toBe("process.exit called");
      }

      expect(mockExit).toHaveBeenCalledWith(1);
      expect(cronMocks.schedule).not.toHaveBeenCalled();
    });

    it("should start worker and then call startCron in correct order", async () => {
      const callOrder: string[] = [];

      const mockWorkerRun = vi.fn().mockImplementation(() => {
        callOrder.push("worker.run");
      });
      vi.spyOn(Worker.prototype, "run").mockImplementation(mockWorkerRun);

      cronMocks.schedule.mockImplementation(() => {
        callOrder.push("startCron");
      });

      await runWorker(config);

      expect(callOrder).toEqual(["worker.run", "startCron"]);
      expect(mockWorkerRun).toHaveBeenCalledWith(config);
      expect(cronMocks.schedule).toHaveBeenCalledWith("*/5 * * * *", expect.any(Function));
    });
  });
});
