import { sidequestTest } from "@/tests/fixture";
import { Backend } from "@sidequest/backend";
import { JobData, JobState, UniquenessFactory } from "@sidequest/core";
import nodeCron from "node-cron";
import { DummyJob } from "../test-jobs/dummy-job";
import { JobBuilder } from "./job-builder";

vi.mock("node-cron", () => ({
  default: {
    validate: vi.fn(() => true),
    schedule: vi.fn(),
  },
}));

const scheduleMock = vi.mocked(nodeCron.schedule);
const validateMock = vi.mocked(nodeCron.validate);

describe("JobBuilder", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  sidequestTest("enqueues a job at default queue", async ({ backend }) => {
    const jobData = await new JobBuilder(backend, DummyJob).enqueue();
    expect(jobData).toEqual(
      expect.objectContaining({
        queue: "default",
        class: "DummyJob",
        script: expect.stringMatching(/dummy-job\.js$/) as string,
        args: [],
        constructor_args: [],
        state: "waiting",
        available_at: expect.any(Date) as Date,
        inserted_at: expect.any(Date) as Date,
        attempted_at: null,
        completed_at: null,
        failed_at: null,
        canceled_at: null,
        claimed_at: null,
        claimed_by: null,
        attempt: 0,
        max_attempts: 5,
        timeout: null,
      }),
    );
  });

  sidequestTest("enqueues a job setting queue", async ({ backend }) => {
    const jobData = await new JobBuilder(backend, DummyJob).queue("custom_queue").enqueue();
    expect(jobData.queue).toEqual("custom_queue");
  });

  sidequestTest("enqueues a job setting timeout", async ({ backend }) => {
    const jobData = await new JobBuilder(backend, DummyJob).timeout(100).enqueue();
    expect(jobData.timeout).toEqual(100);
  });

  sidequestTest("enqueues a job setting args", async ({ backend }) => {
    const jobData = await new JobBuilder(backend, DummyJob).enqueue("foo", "bar");
    expect(jobData.args).toEqual(["foo", "bar"]);
  });

  sidequestTest("enqueues a job setting constructor args", async ({ backend }) => {
    const jobData = await new JobBuilder(backend, DummyJob).with("foo", "bar").enqueue();
    expect(jobData.constructor_args).toEqual(["foo", "bar"]);
  });

  sidequestTest("enqueues a job setting maxAttempts", async ({ backend }) => {
    const jobData = await new JobBuilder(backend, DummyJob).maxAttempts(7).enqueue();
    expect(jobData.max_attempts).toEqual(7);
  });

  sidequestTest("enqueues a job setting availableAt", async ({ backend }) => {
    const futureDate = new Date(Date.now() + 60_000);
    const jobData = await new JobBuilder(backend, DummyJob).availableAt(futureDate).enqueue();
    expect(new Date(jobData.available_at as unknown as string).getTime()).toBeCloseTo(futureDate.getTime(), -2);
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
    vi.useFakeTimers();
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

  describe("constructor defaults", () => {
    sidequestTest("uses default queue when no defaults provided", async ({ backend }) => {
      const jobData = await new JobBuilder(backend, DummyJob).enqueue();
      expect(jobData.queue).toEqual("default");
    });

    sidequestTest("uses default timeout when no defaults provided", async ({ backend }) => {
      const jobData = await new JobBuilder(backend, DummyJob).enqueue();
      expect(jobData.timeout).toBeNull(); // undefined becomes null in the database
    });

    sidequestTest("uses default maxAttempts when no defaults provided", async ({ backend }) => {
      const jobData = await new JobBuilder(backend, DummyJob).enqueue();
      expect(jobData.max_attempts).toEqual(5);
    });

    sidequestTest("uses default availableAt when no defaults provided", async ({ backend }) => {
      const beforeEnqueue = new Date();
      const jobData = await new JobBuilder(backend, DummyJob).enqueue();
      const afterEnqueue = new Date();

      const availableAt = new Date(jobData.available_at as unknown as string);
      expect(availableAt.getTime()).toBeGreaterThanOrEqual(beforeEnqueue.getTime());
      expect(availableAt.getTime()).toBeLessThanOrEqual(afterEnqueue.getTime());
    });

    sidequestTest("uses default uniqueness when no defaults provided", async ({ backend }) => {
      const jobData = await new JobBuilder(backend, DummyJob).enqueue();
      expect(jobData.unique_digest).toBeNull(); // uniqueness is false by default, so no digest
    });
  });

  describe("constructor defaults with custom values", () => {
    sidequestTest("uses custom queue default", async ({ backend }) => {
      const defaults = { queue: "custom-default-queue" };
      const jobData = await new JobBuilder(backend, DummyJob, defaults).enqueue();
      expect(jobData.queue).toEqual("custom-default-queue");
    });

    sidequestTest("uses custom timeout default", async ({ backend }) => {
      const defaults = { timeout: 30000 };
      const jobData = await new JobBuilder(backend, DummyJob, defaults).enqueue();
      expect(jobData.timeout).toEqual(30000);
    });

    sidequestTest("uses custom maxAttempts default", async ({ backend }) => {
      const defaults = { maxAttempts: 3 };
      const jobData = await new JobBuilder(backend, DummyJob, defaults).enqueue();
      expect(jobData.max_attempts).toEqual(3);
    });

    sidequestTest("uses custom availableAt default", async ({ backend }) => {
      const customDate = new Date(Date.now() + 120_000);
      const defaults = { availableAt: customDate };
      const jobData = await new JobBuilder(backend, DummyJob, defaults).enqueue();
      expect(new Date(jobData.available_at as unknown as string).getTime()).toBeCloseTo(customDate.getTime(), -2);
    });

    sidequestTest("uses custom uniqueness default (boolean true)", async ({ backend }) => {
      const defaults = { uniqueness: true as const };
      const jobData = await new JobBuilder(backend, DummyJob, defaults).enqueue();
      expect(jobData.unique_digest).toBeTruthy(); // uniqueness is enabled, so digest should exist
    });

    sidequestTest("uses custom uniqueness default (object with withArgs)", async ({ backend }) => {
      const defaults = { uniqueness: { withArgs: true } };
      const jobData = await new JobBuilder(backend, DummyJob, defaults).enqueue();
      expect(jobData.unique_digest).toBeTruthy(); // uniqueness is enabled, so digest should exist
    });

    sidequestTest("uses custom uniqueness default (object with period)", async ({ backend }) => {
      const defaults = { uniqueness: { period: "hour" as const } };
      const jobData = await new JobBuilder(backend, DummyJob, defaults).enqueue();
      expect(jobData.unique_digest).toBeTruthy(); // uniqueness is enabled, so digest should exist
    });
  });

  describe("method calls override constructor defaults", () => {
    sidequestTest("queue() method overrides default queue", async ({ backend }) => {
      const defaults = { queue: "default-queue" };
      const jobData = await new JobBuilder(backend, DummyJob, defaults).queue("override-queue").enqueue();
      expect(jobData.queue).toEqual("override-queue");
    });

    sidequestTest("timeout() method overrides default timeout", async ({ backend }) => {
      const defaults = { timeout: 10000 };
      const jobData = await new JobBuilder(backend, DummyJob, defaults).timeout(20000).enqueue();
      expect(jobData.timeout).toEqual(20000);
    });

    sidequestTest("maxAttempts() method overrides default maxAttempts", async ({ backend }) => {
      const defaults = { maxAttempts: 3 };
      const jobData = await new JobBuilder(backend, DummyJob, defaults).maxAttempts(7).enqueue();
      expect(jobData.max_attempts).toEqual(7);
    });

    sidequestTest("availableAt() method overrides default availableAt", async ({ backend }) => {
      const defaultDate = new Date(Date.now() + 60_000);
      const overrideDate = new Date(Date.now() + 120_000);
      const defaults = { availableAt: defaultDate };
      const jobData = await new JobBuilder(backend, DummyJob, defaults).availableAt(overrideDate).enqueue();
      expect(new Date(jobData.available_at as unknown as string).getTime()).toBeCloseTo(overrideDate.getTime(), -2);
    });

    sidequestTest("unique() method overrides default uniqueness (false to true)", async ({ backend }) => {
      const defaults = { uniqueness: false as const };
      const jobData = await new JobBuilder(backend, DummyJob, defaults).unique(true).enqueue();
      expect(jobData.unique_digest).toBeTruthy(); // uniqueness is enabled, so digest should exist
    });

    sidequestTest("unique() method overrides default uniqueness (true to false)", async ({ backend }) => {
      const defaults = { uniqueness: true as const };
      const jobData = await new JobBuilder(backend, DummyJob, defaults).unique(false).enqueue();
      expect(jobData.unique_digest).toBeNull(); // uniqueness is disabled, so no digest
    });

    sidequestTest("unique() method overrides default uniqueness (object)", async ({ backend }) => {
      const defaults = { uniqueness: false as const };
      const jobData = await new JobBuilder(backend, DummyJob, defaults)
        .unique({ withArgs: true, period: "minute" })
        .enqueue();
      expect(jobData.unique_digest).toBeTruthy(); // uniqueness is enabled, so digest should exist
    });
  });

  describe("schedule", () => {
    let jobBuilder: JobBuilder<typeof DummyJob>;

    beforeEach(() => {
      vi.clearAllMocks();
      jobBuilder = new JobBuilder({} as Backend, DummyJob);
    });

    it("calls node-cron with correct cron expression and enqueues job with args", async () => {
      const cronExpression = "* * * * *";

      const createNewJobMock = vi.fn().mockResolvedValue({} as JobData);
      const backendMock = { createNewJob: createNewJobMock } as unknown as Backend;
      jobBuilder = new JobBuilder(backendMock, DummyJob);

      await jobBuilder.schedule(cronExpression, "foo", "bar");

      expect(nodeCron.validate).toHaveBeenCalledWith(cronExpression);
      expect(nodeCron.schedule).toHaveBeenCalled();

      const [calledExpression, callback] = scheduleMock.mock.calls[0] as [
        string,
        (...args: unknown[]) => unknown,
        unknown?,
      ];
      expect(calledExpression).toBe(cronExpression);

      await callback();

      expect(createNewJobMock).toHaveBeenCalled();
    });

    it("throws error if cron expression is invalid", async () => {
      validateMock.mockReturnValueOnce(false);

      await expect(() => jobBuilder.schedule("invalid-cron")).rejects.toThrow("Invalid cron expression invalid-cron");
    });
  });

  describe("manualJobResolution", () => {
    sidequestTest("enqueues a job with manual job resolution enabled", async ({ backend }) => {
      const jobData = await new JobBuilder(backend, DummyJob, undefined, true).enqueue();
      expect(jobData).toEqual(
        expect.objectContaining({
          queue: "default",
          class: "DummyJob",
          script: "manual-resolution",
          args: [],
          constructor_args: [],
          state: "waiting",
          available_at: expect.any(Date) as Date,
          inserted_at: expect.any(Date) as Date,
          attempted_at: null,
          completed_at: null,
          failed_at: null,
          canceled_at: null,
          claimed_at: null,
          claimed_by: null,
          attempt: 0,
          max_attempts: 5,
          timeout: null,
        }),
      );
    });

    sidequestTest("works with all builder methods when manualJobResolution is true", async ({ backend }) => {
      const futureDate = new Date(Date.now() + 60_000);
      const jobData = await new JobBuilder(backend, DummyJob, undefined, true)
        .queue("manual-queue")
        .timeout(30000)
        .maxAttempts(3)
        .availableAt(futureDate)
        .unique(true)
        .with("constructor-arg")
        .enqueue("run-arg");

      expect(jobData).toEqual(
        expect.objectContaining({
          queue: "manual-queue",
          class: "DummyJob",
          script: "manual-resolution",
          args: ["run-arg"],
          constructor_args: ["constructor-arg"],
          state: "waiting",
          timeout: 30000,
          max_attempts: 3,
          unique_digest: expect.any(String) as string,
        }),
      );
      expect(new Date(jobData.available_at as unknown as string).getTime()).toBeCloseTo(futureDate.getTime(), -2);
    });

    sidequestTest("should not call job.ready() when manualJobResolution is true", async ({ backend }) => {
      const readySpy = vi.fn();

      // Create a mock job class to spy on ready method
      class MockJob extends DummyJob {
        ready = readySpy;
      }

      await new JobBuilder(backend, MockJob, undefined, true).enqueue();

      expect(readySpy).not.toHaveBeenCalled();
    });

    sidequestTest("should call job.ready() when manualJobResolution is false (default)", async ({ backend }) => {
      const readySpy = vi.fn().mockResolvedValue(undefined);

      // Create a mock job class to spy on ready method
      class MockJob extends DummyJob {
        ready = readySpy;
        script = "auto-resolved-script.js";
      }

      await new JobBuilder(backend, MockJob, undefined, false).enqueue();

      expect(readySpy).toHaveBeenCalledOnce();
    });

    sidequestTest("should work with schedule when manualJobResolution is true", async () => {
      const cronExpression = "0 0 * * *";
      const createNewJobMock = vi.fn().mockResolvedValue({} as JobData);
      const backendMock = { createNewJob: createNewJobMock } as unknown as Backend;

      const jobBuilder = new JobBuilder(backendMock, DummyJob, undefined, true);
      await jobBuilder.schedule(cronExpression, "scheduled-arg");

      expect(nodeCron.validate).toHaveBeenCalledWith(cronExpression);
      expect(nodeCron.schedule).toHaveBeenCalled();

      const [, callback] = scheduleMock.mock.calls[0] as [string, (...args: unknown[]) => unknown, unknown?];

      await callback();

      expect(createNewJobMock).toHaveBeenCalledWith(
        expect.objectContaining({
          class: "DummyJob",
          script: "manual-resolution",
          args: ["scheduled-arg"],
        }),
      );
    });

    sidequestTest("should enqueue multiple jobs when manualJobResolution is true", async ({ backend }) => {
      const jobBuilder = new JobBuilder(backend, DummyJob, undefined, true);

      await jobBuilder.enqueue("first");
      await jobBuilder.enqueue("second");

      const jobs = await backend.listJobs({
        jobClass: DummyJob.name,
      });

      expect(jobs.length).toBe(2);
      expect(jobs[0].script).toBe("manual-resolution");
      expect(jobs[1].script).toBe("manual-resolution");
    });

    sidequestTest("should respect uniqueness constraints when manualJobResolution is true", async ({ backend }) => {
      const jobBuilder = new JobBuilder(backend, DummyJob, undefined, true);

      await jobBuilder.unique(true).enqueue("unique-test");
      await expect(jobBuilder.unique(true).enqueue("unique-test")).rejects.toThrow();

      const jobs = await backend.listJobs({
        jobClass: DummyJob.name,
      });

      expect(jobs.length).toBe(1);
      expect(jobs[0].script).toBe("manual-resolution");
    });
  });
});
