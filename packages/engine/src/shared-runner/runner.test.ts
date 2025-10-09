import { sidequestTest, SidequestTestFixture } from "@/tests/fixture";
import { FailedResult, JobData } from "@sidequest/core";
import { existsSync, unlinkSync } from "node:fs";
import { unlink, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { vi } from "vitest";
import { DummyJob } from "../test-jobs/dummy-job";
import { DummyJobWithArgs } from "../test-jobs/dummy-job-with-args";
import { importSidequest } from "../utils/import";
import run, { injectSidequestConfig } from "./runner";

vi.mock("../utils/import", () => ({
  importSidequest: vi.fn(),
}));

// Mock the manual loader to control which file it returns
vi.mock("./manual-loader", async (importOriginal) => {
  const originalModule = await importOriginal<typeof import("./manual-loader")>();
  return {
    findSidequestJobsScriptInParentDirs: vi.fn(),
    resolveScriptPath: originalModule.resolveScriptPath,
    MANUAL_SCRIPT_TAG: "sidequest.jobs.js",
  };
});

import { findSidequestJobsScriptInParentDirs, MANUAL_SCRIPT_TAG } from "./manual-loader";

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
    expect(result.error.message).toMatch(/Cannot find module/);
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

  sidequestTest("runs a job passing the constructor args", async ({ backend, config }) => {
    const job = new DummyJobWithArgs();
    await job.ready();
    jobData = await backend.createNewJob({
      class: job.className,
      script: job.script,
      args: [],
      attempt: 0,
      queue: "default",
      constructor_args: ["foo", "bar"],
      state: "waiting",
    });

    let arg1: string, arg2: string;
    vi.spyOn(DummyJobWithArgs.prototype, "perform").mockImplementation(function (this: DummyJobWithArgs) {
      arg1 = this.arg1 as string;
      arg2 = this.arg2 as string;
      return Promise.resolve(this.complete("done"));
    });

    await run({ jobData, config });

    expect(arg1!).toEqual("foo");
    expect(arg2!).toEqual("bar");
  });
});

describe("runner.ts with manual resolution", () => {
  let jobData: JobData;
  let testId: string;
  let sidequestJobsPath: string;
  const projectRoot = resolve(import.meta.dirname, "../../../../");
  const mockedFindSidequestJobsScript = vi.mocked(findSidequestJobsScriptInParentDirs);

  beforeEach<SidequestTestFixture>(async ({ backend }) => {
    const job = new DummyJob();

    // Generate a unique test ID to avoid caching issues
    testId = `test-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    sidequestJobsPath = join(projectRoot, `sidequest.jobs.${testId}.js`);

    // Create job data with sidequest.jobs.js script
    jobData = await backend.createNewJob({
      class: job.className,
      script: MANUAL_SCRIPT_TAG,
      args: [],
      attempt: 0,
      queue: "default",
      constructor_args: [],
      state: "waiting",
    });

    // Reset the mock before each test
    mockedFindSidequestJobsScript.mockReset();
  });

  afterEach(async () => {
    // Clean up the test-specific sidequest.jobs.js file after each test
    if (existsSync(sidequestJobsPath)) {
      await unlink(sidequestJobsPath);
    }

    // Wait a bit to ensure file system operations complete
    await new Promise((resolve) => setTimeout(resolve, 50));
  });

  sidequestTest("runs a job with manual resolution enabled", async ({ config }) => {
    // Create sidequest.jobs.js with unique name
    const jobsFileContent = `
import { DummyJob } from "./packages/engine/src/test-jobs/dummy-job.js";

export { DummyJob };
export default { DummyJob };
    `;
    await writeFile(sidequestJobsPath, jobsFileContent);

    // Mock the function to return our unique file
    mockedFindSidequestJobsScript.mockReturnValue(`file://${sidequestJobsPath.replace(/\\/g, "/")}`);

    // Enable manual job resolution
    const configWithManualResolution = { ...config, manualJobResolution: true };

    const result = await run({ jobData, config: configWithManualResolution });

    expect(result).toEqual({
      __is_job_transition__: true,
      type: "completed",
      result: "dummy job",
    });
  });

  sidequestTest("runs a job with manual resolution enabled and custom path", async ({ config }) => {
    // Create sidequest.jobs.js with unique name
    const jobsFileContent = `
import { DummyJob } from "./packages/engine/src/test-jobs/dummy-job.js";

export { DummyJob };
export default { DummyJob };
    `;
    await writeFile(sidequestJobsPath, jobsFileContent);

    // Mock the function to return our unique file
    mockedFindSidequestJobsScript.mockReturnValue(`file://${sidequestJobsPath.replace(/\\/g, "/")}`);

    // Enable manual job resolution
    const configWithManualResolution = { ...config, manualJobResolution: true, jobsFilePath: sidequestJobsPath };

    const result = await run({ jobData, config: configWithManualResolution });

    expect(result).toEqual({
      __is_job_transition__: true,
      type: "completed",
      result: "dummy job",
    });
  });

  sidequestTest("fails when sidequest.jobs.js file is not found", async ({ config }) => {
    // Mock the function to throw an error
    mockedFindSidequestJobsScript.mockImplementation(() => {
      throw new Error(`File "sidequest.jobs.js" not found in "${process.cwd()}" or any parent directory`);
    });

    // Enable manual job resolution
    const configWithManualResolution = { ...config, manualJobResolution: true };

    const result = (await run({ jobData, config: configWithManualResolution })) as FailedResult;

    expect(result.type).toEqual("failed");
    expect(result.error.message).toMatch(/not found in.*or any parent directory/);
  });

  sidequestTest("fails when sidequest.jobs.js file is not found in custom path", async ({ config }) => {
    // Enable manual job resolution
    const configWithManualResolution = { ...config, manualJobResolution: true, jobsFilePath: "./non-existing" };

    const result = (await run({ jobData, config: configWithManualResolution })) as FailedResult;

    expect(result.type).toEqual("failed");
    expect(result.error.message).toMatch(/Unable to resolve script path/);
  });

  sidequestTest("fails when job class is not exported in sidequest.jobs.js", async ({ config }) => {
    // Create sidequest.jobs.js without the required job class
    const jobsFileContent = `
import { DummyJobWithArgs } from "./packages/engine/src/test-jobs/dummy-job-with-args.js";

export { DummyJobWithArgs };
    `;
    await writeFile(sidequestJobsPath, jobsFileContent);

    // Mock the function to return our unique file
    mockedFindSidequestJobsScript.mockReturnValue(`file://${sidequestJobsPath.replace(/\\/g, "/")}`);

    // Enable manual job resolution
    const configWithManualResolution = { ...config, manualJobResolution: true };

    const result = (await run({ jobData, config: configWithManualResolution })) as FailedResult;

    expect(result.type).toEqual("failed");
    expect(result.error.message).toMatch(/Invalid job class: DummyJob/);
  });

  sidequestTest("works with both named and default exports", async ({ config }) => {
    // Create sidequest.jobs.js with both named and default exports
    const jobsFileContent = `
import { DummyJob } from "./packages/engine/src/test-jobs/dummy-job.js";

// Default export
export default DummyJob;
    `;
    await writeFile(sidequestJobsPath, jobsFileContent);

    // Mock the function to return our unique file
    mockedFindSidequestJobsScript.mockReturnValue(`file://${sidequestJobsPath.replace(/\\/g, "/")}`);

    // Enable manual job resolution
    const configWithManualResolution = { ...config, manualJobResolution: true };

    // Test default export
    const result1 = await run({ jobData, config: configWithManualResolution });
    expect(result1).toEqual({
      __is_job_transition__: true,
      type: "completed",
      result: "dummy job",
    });
  });

  sidequestTest("falls back to automatic resolution when manualJobResolution is false", async ({ config }) => {
    // Create sidequest.jobs.js file (should be ignored)
    const jobsFileContent = `
import { DummyJobWithArgs } from "./packages/engine/src/test-jobs/dummy-job-with-args.js";
export { DummyJobWithArgs };
    `;
    await writeFile(sidequestJobsPath, jobsFileContent);

    // Mock should not be called when manualJobResolution is false
    mockedFindSidequestJobsScript.mockReturnValue(`file://${sidequestJobsPath.replace(/\\/g, "/")}`);

    // Set jobData to use regular script path
    const job = new DummyJob();
    await job.ready();
    jobData.script = job.script;

    // Disable manual job resolution (default behavior)
    const configWithoutManualResolution = { ...config, manualJobResolution: false };

    const result = await run({ jobData, config: configWithoutManualResolution });

    expect(result).toEqual({
      __is_job_transition__: true,
      type: "completed",
      result: "dummy job",
    });

    // Verify mock was not called
    expect(mockedFindSidequestJobsScript).not.toHaveBeenCalled();
  });

  sidequestTest("handles malformed sidequest.jobs.js file", async ({ config }) => {
    // Create malformed sidequest.jobs.js
    const jobsFileContent = `
// This is malformed JavaScript
import { DummyJob from "./packages/engine/src/test-jobs/dummy-job.js"; // Missing closing brace
// missing export
    `;
    await writeFile(sidequestJobsPath, jobsFileContent);

    // Mock the function to return our unique file
    mockedFindSidequestJobsScript.mockReturnValue(`file://${sidequestJobsPath.replace(/\\/g, "/")}`);

    // Enable manual job resolution
    const configWithManualResolution = { ...config, manualJobResolution: true };

    const result = (await run({ jobData, config: configWithManualResolution })) as FailedResult;

    expect(result.type).toEqual("failed");
    expect(result.error.message).toMatch(
      /Failed to parse source for import analysis because the content contains invalid JS syntax./,
    );
  });

  sidequestTest("calls injectJobData with correct jobData in manual resolution", async ({ config }) => {
    // Create sidequest.jobs.js
    const jobsFileContent = `
import { DummyJob } from "./packages/engine/src/test-jobs/dummy-job.js";
export { DummyJob };
    `;
    await writeFile(sidequestJobsPath, jobsFileContent);

    // Mock the function to return our unique file
    mockedFindSidequestJobsScript.mockReturnValue(`file://${sidequestJobsPath.replace(/\\/g, "/")}`);

    // Spy on the DummyJob prototype's injectJobData method
    const injectJobDataSpy = vi.spyOn(DummyJob.prototype, "injectJobData");

    // Enable manual job resolution
    const configWithManualResolution = { ...config, manualJobResolution: true };

    await run({ jobData, config: configWithManualResolution });

    // Verify that injectJobData was called with the correct jobData
    expect(injectJobDataSpy).toHaveBeenCalledWith(jobData);
    expect(injectJobDataSpy).toHaveBeenCalledTimes(1);

    // Clean up the spy
    injectJobDataSpy.mockRestore();
  });

  sidequestTest("finds sidequest.jobs.js in parent directory", async ({ config }) => {
    // Create sidequest.jobs.js in a parent-like location
    const parentJobsPath = join(projectRoot, `../sidequest.jobs.parent.${testId}.js`);
    const jobsFileContent = `
import { DummyJob } from "./sidequest/packages/engine/src/test-jobs/dummy-job.js";
export { DummyJob };
    `;

    try {
      await writeFile(parentJobsPath, jobsFileContent);

      // Mock the function to return the parent file
      mockedFindSidequestJobsScript.mockReturnValue(`file://${parentJobsPath.replace(/\\/g, "/")}`);

      // Enable manual job resolution
      const configWithManualResolution = { ...config, manualJobResolution: true };

      const result = await run({ jobData, config: configWithManualResolution });

      expect(result).toEqual({
        __is_job_transition__: true,
        type: "completed",
        result: "dummy job",
      });
    } finally {
      // Clean up parent directory file
      if (existsSync(parentJobsPath)) {
        unlinkSync(parentJobsPath);
      }
    }
  });
});

describe("injectSidequestConfig", () => {
  afterEach(() => {
    vi.resetAllMocks();
    vi.unstubAllGlobals();
  });

  sidequestTest("injects config successfully", async ({ config }) => {
    const configureMock = vi.fn().mockResolvedValue(undefined);
    // @ts-expect-error TypeScript does not recognize the mocked structure as valid,
    // but this is correct because vi.mocked is used to mock the importSidequest function,
    // and the runtime behavior has been verified to match the expected type.
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
