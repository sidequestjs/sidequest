import { sidequestTest } from "@/tests/fixture";
import { CompletedResult, JobState, RetryResult, SnoozeResult, UniquenessFactory } from "@sidequest/core";
import { DummyJob } from "../test-jobs/dummy-job";
import { Job } from "./job";
import { JobBuilder } from "./job-builder";

describe("job.ts", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  sidequestTest("should expose script and className correctly", async () => {
    const job = new DummyJob();
    await job.ready();
    expect(typeof job.script).toBe("string");
    expect(job.className).toBe("DummyJob");
  });

  sidequestTest("should enqueue job", async ({ backend }) => {
    await new JobBuilder(backend, DummyJob).enqueue();
    const jobData = await backend.listJobs({
      jobClass: DummyJob.name,
    });

    expect(jobData.length).toBe(1);
  });

  sidequestTest("should enqueue job in different queue", async ({ backend }) => {
    await new JobBuilder(backend, DummyJob).queue("test-queue").enqueue();
    const jobData = await backend.listJobs({
      jobClass: DummyJob.name,
      queue: "test-queue",
    });

    expect(jobData.length).toBe(1);
  });

  sidequestTest("should enqueue job with timeout", async ({ backend }) => {
    await new JobBuilder(backend, DummyJob).timeout(100).enqueue();
    const jobData = await backend.listJobs({
      jobClass: DummyJob.name,
    });

    expect(jobData.length).toBe(1);
    expect(jobData[0].timeout).toBe(100);
  });

  sidequestTest("should be able to enqueue duplicated jobs", async ({ backend }) => {
    await new JobBuilder(backend, DummyJob).enqueue();
    await new JobBuilder(backend, DummyJob).enqueue();
    const jobData = await backend.listJobs({
      jobClass: DummyJob.name,
    });

    expect(jobData.length).toBe(2);
  });

  sidequestTest("should not be able to enqueue duplicated jobs", async ({ backend }) => {
    await new JobBuilder(backend, DummyJob).unique(true).enqueue();
    await expect(new JobBuilder(backend, DummyJob).unique(true).enqueue()).rejects.toThrow();

    const jobData = await backend.listJobs({
      jobClass: DummyJob.name,
    });

    expect(jobData.length).toBe(1);
  });

  sidequestTest("should not be able to enqueue duplicated jobs in the same period", async ({ backend }) => {
    await new JobBuilder(backend, DummyJob).unique({ period: "second" }).enqueue();
    await expect(new JobBuilder(backend, DummyJob).unique({ period: "second" }).enqueue()).rejects.toThrow();
    vi.advanceTimersByTime(1100);
    await new JobBuilder(backend, DummyJob).unique({ period: "second" }).enqueue();

    const jobData = await backend.listJobs({
      jobClass: DummyJob.name,
    });

    expect(jobData.length).toBe(2);
  });

  sidequestTest(
    "should not be able to enqueue duplicated jobs with different args withargs=false",
    async ({ backend }) => {
      await new JobBuilder(backend, DummyJob).unique({ withArgs: false }).enqueue();
      await expect(new JobBuilder(backend, DummyJob).unique({ withArgs: false }).enqueue("arg1")).rejects.toThrow();

      const jobData = await backend.listJobs({
        jobClass: DummyJob.name,
      });

      expect(jobData.length).toBe(1);
    },
  );

  sidequestTest("should be able to enqueue duplicated jobs with different args", async ({ backend }) => {
    await new JobBuilder(backend, DummyJob).unique({ withArgs: true }).enqueue();
    await new JobBuilder(backend, DummyJob).unique({ withArgs: true }).enqueue("arg1");

    const jobData = await backend.listJobs({
      jobClass: DummyJob.name,
    });

    expect(jobData.length).toBe(2);
  });

  sidequestTest("should not be able to enqueue duplicated jobs with same args withargs=true", async ({ backend }) => {
    await new JobBuilder(backend, DummyJob).unique({ withArgs: true }).enqueue("arg1");
    await expect(new JobBuilder(backend, DummyJob).unique({ withArgs: true }).enqueue("arg1")).rejects.toThrow();

    const jobData = await backend.listJobs({
      jobClass: DummyJob.name,
    });

    expect(jobData.length).toBe(1);
  });

  sidequestTest.for([
    { expected: 1, state: "waiting" },
    { expected: 1, state: "running" },
    { expected: 1, state: "claimed" },
    { expected: 2, state: "canceled" },
    { expected: 2, state: "failed" },
    { expected: 2, state: "completed" },
  ] as { expected: number; state: JobState }[])(
    "should have %i jobs if first job is %s",
    async ({ expected, state }, { backend }) => {
      const job1 = await new JobBuilder(backend, DummyJob).unique(true).enqueue();

      const newData = { ...job1, state };

      const uniqueness = UniquenessFactory.create(newData.uniqueness_config!);
      newData.unique_digest = uniqueness.digest(newData);
      await backend.updateJob(newData);

      try {
        await new JobBuilder(backend, DummyJob).unique(true).enqueue();
      } catch {
        // noop
      }

      const jobData = await backend.listJobs({
        jobClass: DummyJob.name,
      });

      expect(jobData.length).toBe(expected);
    },
  );

  sidequestTest("creates a complete transition", () => {
    const job = new DummyJob();
    const transition = job.complete("foo bar");
    expect(transition.result).toBe("foo bar");
  });

  sidequestTest("creates a fail transition", () => {
    const job = new DummyJob();
    const transition = job.fail("error");
    expect(transition.error).toEqual({ message: "error" });
  });

  sidequestTest("creates a retry transition", () => {
    const job = new DummyJob();
    const transition = job.retry("reason", 1000);
    expect(transition.error).toEqual({ message: "reason" });
    expect(transition.delay).toEqual(1000);
  });

  sidequestTest("creates a snooze transition", () => {
    const job = new DummyJob();
    const transition = job.snooze(1000);
    expect(transition.delay).toBe(1000);
  });

  sidequestTest("fail/retry should accept an Error object", () => {
    const job = new DummyJob();
    const error = new Error("fail");
    expect(job.fail(error).error.message).toEqual("fail");
    expect(job.retry(error).error.message).toEqual("fail");
  });

  describe("perform", () => {
    sidequestTest("should return CompleteResult if run returns a value", async () => {
      class ValueJob extends Job {
        run() {
          return "abc";
        }
      }
      const job = new ValueJob();
      const result = (await job.perform()) as CompletedResult;
      expect(result.type).toBe("completed");
      expect(result.result).toBe("abc");
    });

    sidequestTest("should return the JobResult return by run", async () => {
      class TransitionJob extends Job {
        run() {
          return { __is_job_transition__: true, type: "snooze" } as SnoozeResult;
        }
      }
      const job = new TransitionJob();
      const result = (await job.perform()) as SnoozeResult;
      expect(result.type).toBe("snooze");
    });

    sidequestTest("should return RetryResult if run throws", async () => {
      class ErrorJob extends Job {
        run() {
          throw new Error("fail!");
        }
      }
      const job = new ErrorJob();
      const result = (await job.perform()) as RetryResult;
      expect(result.type).toBe("retry");
      expect(result.error.message).toEqual("fail!");
    });

    sidequestTest("should return RetryResult if run unhandled promise", async () => {
      class DummyUnhandled extends Job {
        run() {
          return new Promise(() => {
            throw new Error("unhandled error");
          });
        }
      }

      const job = new DummyUnhandled();
      const result = (await job.perform()) as RetryResult;
      expect(result.type).toBe("retry");
      expect(result.error.message).toEqual("unhandled error");
    });
  });
});
