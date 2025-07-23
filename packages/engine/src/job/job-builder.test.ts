import { sidequestTest } from "@/tests/fixture";
import { DummyJob } from "../test-jobs/dummy-job";
import { JobBuilder } from "./job-builder";

describe("JobBuilder", () => {
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
});
