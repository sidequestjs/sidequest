import { unlink } from "fs";
import { JobState } from "packages/core/dist";
import { DefaultDeduplicationStrategy } from "../deduplication/default";
import { Engine, SidequestConfig } from "../engine";
import { DummyJob } from "../test-jobs/dummy-job";

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
    await DummyJob.enqueue();
    const jobData = await Engine.getBackend().listJobs({
      jobClass: DummyJob.name,
    });

    expect(jobData.length).toBe(1);
  });

  it("should enqueue job in different queue", async () => {
    await DummyJob.enqueue({
      queue: "test-queue",
    });
    const jobData = await Engine.getBackend().listJobs({
      jobClass: DummyJob.name,
      queue: "test-queue",
    });

    expect(jobData.length).toBe(1);
  });

  it("should enqueue job with timeout", async () => {
    await DummyJob.enqueue({
      timeout: 100,
    });
    const jobData = await Engine.getBackend().listJobs({
      jobClass: DummyJob.name,
    });

    expect(jobData.length).toBe(1);
    expect(jobData[0].timeout).toBe(100);
  });

  it("should be able to enqueue duplicated jobs", async () => {
    await DummyJob.enqueue();
    await DummyJob.enqueue({
      unique: false,
    });
    const jobData = await Engine.getBackend().listJobs({
      jobClass: DummyJob.name,
    });

    expect(jobData.length).toBe(2);
  });

  it("should not be able to enqueue duplicated jobs", async () => {
    await DummyJob.enqueue();
    await expect(
      DummyJob.enqueue({
        unique: true,
      }),
    ).rejects.toThrow();

    const jobData = await Engine.getBackend().listJobs({
      jobClass: DummyJob.name,
    });

    expect(jobData.length).toBe(1);
  });

  it("should not be able to enqueue duplicated jobs with different args withargs=false", async () => {
    await DummyJob.enqueue();
    await expect(
      DummyJob.enqueue(
        {
          unique: true,
        },
        "arg1",
      ),
    ).rejects.toThrow();

    const jobData = await Engine.getBackend().listJobs({
      jobClass: DummyJob.name,
    });

    expect(jobData.length).toBe(1);
  });

  it("should be able to enqueue duplicated jobs with different args", async () => {
    await DummyJob.enqueue();
    await DummyJob.enqueue(
      {
        unique: true,
        deduplicationStrategy: new DefaultDeduplicationStrategy(true),
      },
      "arg1",
    );

    const jobData = await Engine.getBackend().listJobs({
      jobClass: DummyJob.name,
    });

    expect(jobData.length).toBe(2);
  });

  it("should not be able to enqueue duplicated jobs with same args withargs=true", async () => {
    await DummyJob.enqueue(undefined, "arg1");
    await expect(
      DummyJob.enqueue(
        {
          unique: true,
          deduplicationStrategy: new DefaultDeduplicationStrategy(true),
        },
        "arg1",
      ),
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
    const job1 = await DummyJob.enqueue();

    await Engine.getBackend().updateJob({ ...job1, state });

    try {
      await DummyJob.enqueue({
        unique: true,
      });
    } catch {
      // noop
    }

    const jobData = await Engine.getBackend().listJobs({
      jobClass: DummyJob.name,
    });

    expect(jobData.length).toBe(expected);
  });
});
