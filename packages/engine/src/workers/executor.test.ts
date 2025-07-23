import { CompleteTransition, JobData, JobTransition, RetryTransition, RunningTransition } from "@sidequest/core";
import { unlink } from "fs";
import path from "path";
import { afterAll, beforeEach, describe, expect, it, MockInstance, vi } from "vitest";
import { Engine, SidequestConfig } from "../engine";
import { JobTransitioner } from "../job/job-transitioner";
import { execute } from "./executor";

describe("executror.ts", () => {
  const dbLocation = "./sidequest-test.sqlite";
  const config: SidequestConfig = { backend: { driver: "@sidequest/sqlite-backend", config: dbLocation } };

  afterAll(async () => {
    await Engine.close();
    unlink(dbLocation, () => {
      // noop
    });
  });

  describe("execute", () => {
    let claimedJobData: JobData = {} as JobData;

    let configureStub: MockInstance<(config?: SidequestConfig) => Promise<SidequestConfig>>;
    let applyTransitionStub: MockInstance<(jobData: JobData, transition: unknown) => Promise<JobData>>;
    beforeEach(() => {
      vi.restoreAllMocks();

      configureStub = vi.spyOn(Engine, "configure");

      applyTransitionStub = vi
        .spyOn(JobTransitioner, "apply")
        .mockImplementation(async (jobData: JobData, transition: JobTransition) => {
          return Promise.resolve(transition.apply(jobData));
        });

      claimedJobData = {
        id: 1,
        queue: "default",
        state: "claimed",
        script: `file://${path.resolve("packages/engine/src/test-jobs/dummy-job.js").replaceAll("\\\\", "/")}`,
        class: "DummyJob",
        args: [],
        constructor_args: [],
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
      expect(applyTransitionStub).toHaveBeenCalledWith(expect.anything(), expect.any(RunningTransition));
      expect(applyTransitionStub).toHaveBeenCalledWith(expect.anything(), expect.any(CompleteTransition));
      expect(applyTransitionStub).not.toHaveBeenCalledWith(expect.anything(), expect.any(RetryTransition));
    });

    it("fails with wrong class", async () => {
      claimedJobData.class = "BadClass";

      await expect(execute(claimedJobData, config)).rejects.toThrow("Invalid job class: BadClass");

      expect(configureStub).toHaveBeenCalledOnce();
      expect(applyTransitionStub).not.toHaveBeenCalledWith(expect.anything(), expect.any(RunningTransition));
      expect(applyTransitionStub).not.toHaveBeenCalledWith(expect.anything(), expect.any(CompleteTransition));
      expect(applyTransitionStub).not.toHaveBeenCalledWith(expect.anything(), expect.any(RetryTransition));
    });
  });
});
