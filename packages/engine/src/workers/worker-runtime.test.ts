import { sidequestTest, SidequestTestFixture } from "@/tests/fixture";
import { beforeEach, describe, expect, vi } from "vitest";
import { Dispatcher } from "../execution/dispatcher";
import { cleanupFinishedJobs } from "../routines/cleanup-finished-job";
import { releaseStaleJobs } from "../routines/release-stale-jobs";
import { WorkerRuntime } from "./worker-runtime";

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
  schedule: vi.fn(),
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

describe("WorkerRuntime", () => {
  let runtime: WorkerRuntime;

  beforeEach<SidequestTestFixture>(async ({ backend, config }) => {
    await backend.migrate();
    vi.clearAllMocks();
    cronMocks.schedule.mockReturnValue({ execute: vi.fn(), stop: vi.fn() });
    runtime = new WorkerRuntime(backend, config);
  });

  describe("start", () => {
    sidequestTest("starts the dispatcher and schedules both cron routines", async () => {
      const dispatcherStart = vi.spyOn(Dispatcher.prototype, "start").mockImplementation(() => undefined);

      await runtime.start();

      expect(dispatcherStart).toHaveBeenCalled();
      expect(cronMocks.schedule).toHaveBeenCalledTimes(2);
      expect(cronMocks.schedule).toHaveBeenCalledWith("*/60 * * * *", expect.any(Function));
    });
  });

  describe("startCron", () => {
    sidequestTest("runs releaseStaleJobs when the stale cron executes", async ({ config }) => {
      await runtime.startCron();

      const cronCallback = cronMocks.schedule.mock.calls[0][1] as () => unknown;
      await cronCallback();

      expect(releaseStaleJobs).toHaveBeenCalledWith(
        expect.any(Object),
        config.releaseStaleJobsMaxStaleMs,
        config.releaseStaleJobsMaxClaimedMs,
      );
    });

    sidequestTest("runs cleanupFinishedJobs when the cleanup cron executes", async ({ config }) => {
      await runtime.startCron();

      const cronCallback = cronMocks.schedule.mock.calls[1][1] as () => unknown;
      await cronCallback();

      expect(cleanupFinishedJobs).toHaveBeenCalledWith(expect.any(Object), config.cleanupFinishedJobsOlderThan);
    });

    sidequestTest("does not schedule routines that are disabled", async ({ backend, config }) => {
      const disabled = new WorkerRuntime(backend, {
        ...config,
        releaseStaleJobsIntervalMin: false,
        cleanupFinishedJobsIntervalMin: false,
      });

      await disabled.startCron();

      expect(cronMocks.schedule).not.toHaveBeenCalled();
    });

    sidequestTest("swallows and logs errors thrown by a routine", async () => {
      (releaseStaleJobs as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("fail"));

      await runtime.startCron();

      const cronCallback = cronMocks.schedule.mock.calls[0][1] as () => unknown;
      await expect(cronCallback()).resolves.toBeUndefined();
      expect(releaseStaleJobs).toHaveBeenCalled();
    });
  });

  describe("shutdown", () => {
    sidequestTest("stops the scheduled cron tasks and drains the dispatcher", async () => {
      const stop = vi.fn();
      cronMocks.schedule.mockReturnValue({ execute: vi.fn(), stop });
      vi.spyOn(Dispatcher.prototype, "start").mockImplementation(() => undefined);
      const dispatcherStop = vi.spyOn(Dispatcher.prototype, "stop").mockResolvedValue(undefined);

      await runtime.start();
      await runtime.shutdown();

      expect(stop).toHaveBeenCalledTimes(2);
      expect(dispatcherStop).toHaveBeenCalled();
    });
  });
});
