import { sidequestTest, SidequestTestFixture } from "@/tests/fixture";
import { FailedResult, JobData } from "@sidequest/core";
import { vi } from "vitest";
import { DummyJob } from "../test-jobs/dummy-job";
import run from "./runner";

describe("runner.ts", () => {
  let jobData: JobData;

  beforeEach<SidequestTestFixture>(async ({ backend }) => {
    const job = new DummyJob();
    await job.ready();

    jobData = await backend.createNewJob({
      class: job.className,
      script: job.script,
      args: [],
      attempt: 0,
      queue: "default",
      constructor_args: [],
      state: "waiting",
    });
  });

  sidequestTest("runs a job", async () => {
    const result = await run(jobData);
    expect(result).toEqual({ __is_job_transition__: true, type: "completed", result: "dummy job" });
  });

  sidequestTest("fails with invalid script", async () => {
    jobData.script = "invalid!";
    const result = (await run(jobData)) as FailedResult;
    expect(result.type).toEqual("failed");
    expect(result.error.message).toMatch(/Cannot find package 'invalid!'/);
  });

  sidequestTest("fails with invalid class", async () => {
    jobData.class = "InvalidClass";
    const result = (await run(jobData)) as FailedResult;
    expect(result.type).toEqual("failed");
    expect(result.error.message).toMatch(/Invalid job class: InvalidClass/);
  });

  sidequestTest("calls injectJobData with the correct jobData", async () => {
    // Spy on the DummyJob prototype's injectJobData method
    const injectJobDataSpy = vi.spyOn(DummyJob.prototype, "injectJobData");

    await run(jobData);

    // Verify that injectJobData was called with the correct jobData
    expect(injectJobDataSpy).toHaveBeenCalledWith(jobData);
    expect(injectJobDataSpy).toHaveBeenCalledTimes(1);

    // Clean up the spy
    injectJobDataSpy.mockRestore();
  });
});
