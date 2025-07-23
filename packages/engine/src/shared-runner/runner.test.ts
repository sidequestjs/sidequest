import { FailedResult, JobData } from "@sidequest/core";
import { Engine, EngineConfig } from "../engine";
import { DummyJob } from "../test-jobs/dummy-job";
import run from "./runner";

describe("runner.ts", () => {
  const dbLocation = ":memory:";
  const config: EngineConfig = {
    backend: { driver: "@sidequest/sqlite-backend", config: dbLocation },
  };

  let jobData: JobData;

  beforeEach(async () => {
    await Engine.configure(config);
    const backend = Engine.getBackend();
    const job = new DummyJob();
    await job.ready();

    jobData = await backend!.createNewJob({
      class: job.className,
      script: job.script!,
      args: [],
      attempt: 0,
      queue: "default",
      constructor_args: [],
      state: "waiting",
    });
  });

  afterEach(async () => {
    await Engine.close();
  });

  it("runs a job", async () => {
    const result = await run(jobData);
    expect(result).toEqual({ __is_job_transition__: true, type: "completed", result: "dummy job" });
  });

  it("fails with invalid script", async () => {
    jobData.script = "invalid!";
    const result = (await run(jobData)) as FailedResult;
    expect(result.type).toEqual("failed");
    expect(result.error.message).toMatch(/Cannot find package 'invalid!'/);
  });

  it("fails with invalid class", async () => {
    jobData.class = "InvalidClass";
    const result = (await run(jobData)) as FailedResult;
    expect(result.type).toEqual("failed");
    expect(result.error.message).toMatch(/Invalid job class: InvalidClass/);
  });
});
