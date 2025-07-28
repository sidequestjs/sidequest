import { sidequestTest, SidequestTestFixture } from "@/tests/fixture";
import { FailedResult, JobData } from "@sidequest/core";
import { vi } from "vitest";
import { DummyJob } from "../test-jobs/dummy-job";
import { importSidequest } from "../utils/import";
import run, { injectSidequestConfig } from "./runner";

vi.mock("../utils/import", () => ({
  importSidequest: vi.fn(),
}));

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

  sidequestTest("runs a job", async ({ config }) => {
    const result = await run({ jobData, config });
    expect(result).toEqual({ __is_job_transition__: true, type: "completed", result: "dummy job" });
  });

  sidequestTest("fails with invalid script", async ({ config }) => {
    jobData.script = "invalid!";
    const result = (await run({ jobData, config })) as FailedResult;
    expect(result.type).toEqual("failed");
    expect(result.error.message).toMatch(/Cannot find package 'invalid!'/);
  });

  sidequestTest("fails with invalid class", async ({ config }) => {
    jobData.class = "InvalidClass";
    const result = (await run({ jobData, config })) as FailedResult;
    expect(result.type).toEqual("failed");
    expect(result.error.message).toMatch(/Invalid job class: InvalidClass/);
  });

  sidequestTest("calls injectJobData with the correct jobData", async ({ config }) => {
    // Spy on the DummyJob prototype's injectJobData method
    const injectJobDataSpy = vi.spyOn(DummyJob.prototype, "injectJobData");

    await run({ jobData, config });

    // Verify that injectJobData was called with the correct jobData
    expect(injectJobDataSpy).toHaveBeenCalledWith(jobData);
    expect(injectJobDataSpy).toHaveBeenCalledTimes(1);

    // Clean up the spy
    injectJobDataSpy.mockRestore();
  });
});

describe("injectSidequestConfig", () => {
  afterEach(() => {
    vi.resetAllMocks();
    vi.unstubAllGlobals();
  });

  sidequestTest("injects config successfully", async ({ config }) => {
    const configureMock = vi.fn().mockResolvedValue(undefined);
    // Set up the mock for importSidequest
    // @ts-expect-error this is correct
    vi.mocked(importSidequest).mockResolvedValue({ Sidequest: { configure: configureMock } });

    const result = await injectSidequestConfig(config);

    expect(configureMock).toHaveBeenCalledWith({ ...config, skipMigration: true });
    expect(result).toBe(true);
  });

  sidequestTest("returns false and logs warning on error", async ({ config }) => {
    // Set up the mock for importSidequest to reject
    vi.mocked(importSidequest).mockRejectedValue(new Error("Import failed"));

    const result = await injectSidequestConfig(config);

    expect(result).toBe(false);
  });
});
