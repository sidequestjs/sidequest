import {
  CompleteTransition,
  FailTransition,
  JobState,
  RetryTransition,
  SnoozeTransition,
  UniquenessFactory,
} from "@sidequest/core";
import { unlink } from "fs";
import { Engine, Job, SidequestConfig } from "../engine";
import { DummyJob } from "../test-jobs/dummy-job";
import { JobBuilder } from "./job-builder";

describe("job.ts", () => {
  const dbLocation = "./sidequest-test.sqlite";
  const config: SidequestConfig = {
    backend: { driver: "@sidequest/sqlite-backend", config: dbLocation },
  };

  beforeEach(async () => {
    await Engine.configure(config);
    vi.useFakeTimers()
  });

  afterEach(async () => {
    await Engine.close();
    vi.restoreAllMocks();
    unlink(dbLocation, () => {
      // noop
    });
  });

  it("should expose script and className correctly", async () => {
    const job = new DummyJob();
    await job.ready();
    expect(typeof job.script).toBe("string");
    expect(job.className).toBe("DummyJob");
  });

  it("should enqueue job", async () => {
    await new JobBuilder(DummyJob).enqueue();
    const jobData = await Engine.getBackend()!.listJobs({
      jobClass: DummyJob.name,
    });

    expect(jobData.length).toBe(1);
  });

  it("should enqueue job in different queue", async () => {
    await new JobBuilder(DummyJob).queue("test-queue").enqueue();
    const jobData = await Engine.getBackend()!.listJobs({
      jobClass: DummyJob.name,
      queue: "test-queue",
    });

    expect(jobData.length).toBe(1);
  });

  it("should enqueue job with timeout", async () => {
    await new JobBuilder(DummyJob).timeout(100).enqueue();
    const jobData = await Engine.getBackend()!.listJobs({
      jobClass: DummyJob.name,
    });

    expect(jobData.length).toBe(1);
    expect(jobData[0].timeout).toBe(100);
  });

  it("should be able to enqueue duplicated jobs", async () => {
    await new JobBuilder(DummyJob).enqueue();
    await new JobBuilder(DummyJob).enqueue();
    const jobData = await Engine.getBackend()!.listJobs({
      jobClass: DummyJob.name,
    });

    expect(jobData.length).toBe(2);
  });

  it("should not be able to enqueue duplicated jobs", async () => {
    await new JobBuilder(DummyJob).unique(true).enqueue();
    await expect(new JobBuilder(DummyJob).unique(true).enqueue()).rejects.toThrow();

    const jobData = await Engine.getBackend()!.listJobs({
      jobClass: DummyJob.name,
    });

    expect(jobData.length).toBe(1);
  });

  it("should not be able to enqueue duplicated jobs in the same period", async () => {
    await new JobBuilder(DummyJob).unique({ period: "second" }).enqueue();
    await expect(new JobBuilder(DummyJob).unique({ period: "second" }).enqueue()).rejects.toThrow();
    vi.advanceTimersByTime(1100)
    await new JobBuilder(DummyJob).unique({ period: "second" }).enqueue();

    const jobData = await Engine.getBackend()!.listJobs({
      jobClass: DummyJob.name,
    });

    expect(jobData.length).toBe(2);
  });

  it("should not be able to enqueue duplicated jobs with different args withargs=false", async () => {
    await new JobBuilder(DummyJob).unique({ withArgs: false }).enqueue();
    await expect(new JobBuilder(DummyJob).unique({ withArgs: false }).enqueue("arg1")).rejects.toThrow();

    const jobData = await Engine.getBackend()!.listJobs({
      jobClass: DummyJob.name,
    });

    expect(jobData.length).toBe(1);
  });

  it("should be able to enqueue duplicated jobs with different args", async () => {
    await new JobBuilder(DummyJob).unique({ withArgs: true }).enqueue();
    await new JobBuilder(DummyJob).unique({ withArgs: true }).enqueue("arg1");

    const jobData = await Engine.getBackend()!.listJobs({
      jobClass: DummyJob.name,
    });

    expect(jobData.length).toBe(2);
  });

  it("should not be able to enqueue duplicated jobs with same args withargs=true", async () => {
    await new JobBuilder(DummyJob).unique({ withArgs: true }).enqueue("arg1");
    await expect(new JobBuilder(DummyJob).unique({ withArgs: true }).enqueue("arg1")).rejects.toThrow();

    const jobData = await Engine.getBackend()!.listJobs({
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
    const job1 = await new JobBuilder(DummyJob).unique(true).enqueue();

    const newData = { ...job1, state };

    const uniqueness = UniquenessFactory.create(newData.uniqueness_config!);
    newData.unique_digest = uniqueness.digest(newData);
    await Engine.getBackend()!.updateJob(newData);

    try {
      await new JobBuilder(DummyJob).unique(true).enqueue();
    } catch {
      // noop
    }

    const jobData = await Engine.getBackend()!.listJobs({
      jobClass: DummyJob.name,
    });

    expect(jobData.length).toBe(expected);
  });

  it("creates a complete transition", () => {
    const job = new DummyJob();
    const transition = job.complete("result");
    expect(transition).toBeInstanceOf(CompleteTransition);
    expect(transition.result).toBe("result");
  });

  it("creates a fail transition", () => {
    const job = new DummyJob();
    const transition = job.fail("error");
    expect(transition).toBeInstanceOf(FailTransition);
    expect(transition.reason).toBe("error");
  });

  it("creates a retry transition", () => {
    const job = new DummyJob();
    const transition = job.retry("reason", 1000);
    expect(transition).toBeInstanceOf(RetryTransition);
    expect(transition.reason).toBe("reason");
    expect(transition.delay).toBe(1000);
  });

  it("creates a snooze transition", () => {
    const job = new DummyJob();
    const transition = job.snooze(1000);
    expect(transition).toBeInstanceOf(SnoozeTransition);
    expect(transition.delay).toBe(1000);
  });

  it("fail/retry should accept an Error object", () => {
    const job = new DummyJob();
    const error = new Error("fail");
    expect(job.fail(error)).toBeInstanceOf(FailTransition);
    expect(job.retry(error)).toBeInstanceOf(RetryTransition);
  });

  describe("perform", () => {
    it("should return CompleteTransition if run returns a value", async () => {
      class ValueJob extends Job {
        run() {
          return "abc";
        }
      }
      const job = new ValueJob();
      const transition = await job.perform();
      expect(transition).toBeInstanceOf(CompleteTransition);
      expect((transition as CompleteTransition).result).toBe("abc");
    });

    it("should return transition if run returns a JobTransition", async () => {
      class TransitionJob extends Job {
        run() {
          return new RetryTransition("fail!");
        }
      }
      const job = new TransitionJob();
      const transition = await job.perform();
      expect(transition).toBeInstanceOf(RetryTransition);
      expect((transition as RetryTransition).reason).toBe("fail!");
    });

    it("should return RetryTransition if run throws", async () => {
      class ErrorJob extends Job {
        run() {
          throw new Error("fail!");
        }
      }
      const job = new ErrorJob();
      const transition = await job.perform();
      expect(transition).toBeInstanceOf(RetryTransition);
      expect((transition as RetryTransition).reason).toBeInstanceOf(Error);
    });
  });
});
