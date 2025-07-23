import { unlink } from "fs";
import { JobState } from "packages/core/dist";
import { DefaultDeduplicationStrategy } from "../deduplication/default";
import { Engine, SidequestConfig } from "../engine";
import { DummyJob } from "../test-jobs/dummy-job";
import { JobBuilder } from "./job-builder";

describe("job.ts", () => {
  const dbLocation = "./sidequest-test.sqlite";
  const config: SidequestConfig = {
    backend: { driver: "@sidequest/sqlite-backend", config: dbLocation },
  };

  beforeEach(async () => {
    await Engine.configure(config);
  });

  afterEach(async () => {
    await Engine.close();
    unlink(dbLocation, () => {
      // noop
    });
  });

  it("should enqueue job", async () => {
    await new JobBuilder(DummyJob).enqueue();
    const jobData = await Engine.getBackend().listJobs({
      jobClass: DummyJob.name,
    });

    expect(jobData.length).toBe(1);
  });

  it("should enqueue job in different queue", async () => {
    await new JobBuilder(DummyJob).queue("test-queue").enqueue();
    const jobData = await Engine.getBackend().listJobs({
      jobClass: DummyJob.name,
      queue: "test-queue",
    });

    expect(jobData.length).toBe(1);
  });

  it("should enqueue job with timeout", async () => {
    await new JobBuilder(DummyJob).timeout(100).enqueue();
    const jobData = await Engine.getBackend().listJobs({
      jobClass: DummyJob.name,
    });

    expect(jobData.length).toBe(1);
    expect(jobData[0].timeout).toBe(100);
  });

  it("should be able to enqueue duplicated jobs", async () => {
    await new JobBuilder(DummyJob).enqueue();
    await new JobBuilder(DummyJob).unique(false).enqueue();
    const jobData = await Engine.getBackend().listJobs({
      jobClass: DummyJob.name,
    });

    expect(jobData.length).toBe(2);
  });

  it("should not be able to enqueue duplicated jobs", async () => {
    await new JobBuilder(DummyJob).enqueue();
    await expect(new JobBuilder(DummyJob).unique(true).enqueue()).rejects.toThrow();

    const jobData = await Engine.getBackend().listJobs({
      jobClass: DummyJob.name,
    });

    expect(jobData.length).toBe(1);
  });

  it("should not be able to enqueue duplicated jobs with different args withargs=false", async () => {
    await new JobBuilder(DummyJob).enqueue();
    await expect(new JobBuilder(DummyJob).unique(true).enqueue("arg1")).rejects.toThrow();

    const jobData = await Engine.getBackend().listJobs({
      jobClass: DummyJob.name,
    });

    expect(jobData.length).toBe(1);
  });

  it("should be able to enqueue duplicated jobs with different args", async () => {
    await new JobBuilder(DummyJob).enqueue();
    await new JobBuilder(DummyJob).unique(true).deduplication(new DefaultDeduplicationStrategy(true)).enqueue("arg1");

    const jobData = await Engine.getBackend().listJobs({
      jobClass: DummyJob.name,
    });

    expect(jobData.length).toBe(2);
  });

  it("should not be able to enqueue duplicated jobs with same args withargs=true", async () => {
    await new JobBuilder(DummyJob).enqueue("arg1");
    await expect(
      new JobBuilder(DummyJob).unique(true).deduplication(new DefaultDeduplicationStrategy(true)).enqueue("arg1"),
    ).rejects.toThrow();

    const jobData = await Engine.getBackend().listJobs({
      jobClass: DummyJob.name,
    });

    expect(jobData.length).toBe(1);
  });

  it.each([
    [1, "waiting"],
    [1, "running"],
    [1, "claimed"],
    [2, "canceled"],
    [2, "failed"],
    [2, "completed"],
  ] as [number, JobState][])("should have %i jobs if first job is %s", async (expected, state) => {
    const job1 = await new JobBuilder(DummyJob).enqueue();

    await Engine.getBackend().updateJob({ ...job1, state });

    try {
      await new JobBuilder(DummyJob).unique(true).enqueue();
    } catch {
      // noop
    }

    const jobData = await Engine.getBackend().listJobs({
      jobClass: DummyJob.name,
    });

    expect(jobData.length).toBe(expected);
  });
});
