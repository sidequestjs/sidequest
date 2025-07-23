import { JobData } from "@sidequest/core";
import { unlink } from "fs";
import path from "path";
import { afterAll, beforeEach, describe, expect, it, MockInstance, vi } from "vitest";
import { Engine, SidequestConfig } from "../engine";
import { Job } from "../job/job";
import { JobActions } from "../job/job-actions";
import { execute, executeTask } from "./executor";

describe("executror.ts", () => {
  const dbLocation = "./sidequest-test.sqlite";
  const config: SidequestConfig = { backend: { driver: "@sidequest/sqlite-backend", config: dbLocation } };

  afterAll(async () => {
    await Engine.getBackend()?.close();
    unlink(dbLocation, () => {
      // noop
    });
  });

  describe("executeTask", () => {
    it("should resolve when job.run() resolves", async () => {
      const job = {
        run: () => "ok",
      };

      const result = await executeTask(job as Job, []);
      expect(result).toBe("ok");
    });

    it("should reject if job.run() throws an error", async () => {
      const job = {
        run: () => {
          throw new Error("fail");
        },
      };

      await expect(executeTask(job as unknown as Job, [])).rejects.toThrow("fail");
    });

    it("should reject with a timeout error if job.run() hangs", async () => {
      const job = {
        run: async () =>
          new Promise(() => {
            // never resolves
          }),
        timeout: 10,
        class: "MyJob",
      };

      await expect(executeTask(job as Job, [])).rejects.toThrow(/timed out/);
    });
  });

  describe("execute", () => {
    let claimedJobData: JobData = {} as JobData;

    let configureStub: MockInstance<(config?: SidequestConfig) => Promise<SidequestConfig>>;
    let setRunningStub: MockInstance<(jobData: JobData) => Promise<JobData>>;
    let setCompleteStub: MockInstance<(jobData: JobData, result: unknown) => Promise<JobData>>;
    let setFailedStub: MockInstance<(jobData: JobData, error: Error) => Promise<void>>;

    beforeEach(() => {
      vi.restoreAllMocks();

      configureStub = vi.spyOn(Engine, "configure");
      setRunningStub = vi.spyOn(JobActions, "setRunning").mockImplementation(async (j) => Promise.resolve(j));
      setCompleteStub = vi.spyOn(JobActions, "setComplete").mockImplementation(async (j) => Promise.resolve(j));
      setFailedStub = vi.spyOn(JobActions, "setFailed").mockImplementation(async () => {
        // noop
      });

      claimedJobData = {
        id: 1,
        queue: "default",
        state: "claimed",
        script: `file://${path.resolve("packages/engine/src/test-jobs/dummy-job.js").replaceAll("\\", "/")}`,
        class: "DummyJob",
        args: [],
        attempt: 0,
        max_attempts: 10,
        inserted_at: new Date(),
        available_at: new Date(),
        claimed_at: new Date(),
        claimed_by: "dummy-worker",
      };
    });

    it("executes a job", async () => {
      await execute(claimedJobData, config);

      expect(configureStub).toHaveBeenCalledOnce();
      expect(setRunningStub).toHaveBeenCalledOnce();
      expect(setCompleteStub).toHaveBeenCalledOnce();
      expect(setFailedStub).not.toHaveBeenCalled();
    });

    it("executes a failing job", async () => {
      claimedJobData.script = `file://${path.resolve("packages/engine/src/test-jobs/dummy-failed-job.js").replaceAll("\\", "/")}`;

      await expect(execute(claimedJobData, config)).rejects.toThrow("failed job");

      expect(configureStub).toHaveBeenCalledOnce();
      expect(setRunningStub).toHaveBeenCalledOnce();
      expect(setCompleteStub).not.toHaveBeenCalled();
      expect(setFailedStub).toHaveBeenCalledOnce();
    });

    it("fails with wrong class", async () => {
      claimedJobData.class = "BadClass";

      await expect(execute(claimedJobData, config)).rejects.toThrow("Invalid job class: BadClass");

      expect(configureStub).toHaveBeenCalledOnce();
      expect(setRunningStub).not.toHaveBeenCalled();
      expect(setCompleteStub).not.toHaveBeenCalled();
      expect(setFailedStub).not.toHaveBeenCalled();
    });
  });
});
