import { Engine, SidequestConfig } from "../engine";
import { DummyJob } from "../test-jobs/dummy-job";
import { JobBuilder } from "./job-builder";

describe("JobBuilder", () => {
  beforeAll(async () => {
    const dbLocation = ":memory:";
    const config: SidequestConfig = { backend: { driver: "@sidequest/sqlite-backend", config: dbLocation } };
    await Engine.configure(config);
  });

  afterAll(async () => {
    await Engine.getBackend()?.close();
  });

  afterEach(async () => {
    await Engine.getBackend()?.truncate();
  });

  test("enqueues a job at default queue", async () => {
    const jobData = await new JobBuilder(DummyJob).enqueue();
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

  test("enqueues a job setting queue", async () => {
    const jobData = await new JobBuilder(DummyJob).queue("custom_queue").enqueue();
    expect(jobData.queue).toEqual("custom_queue");
  });

  test("enqueues a job setting timeout", async () => {
    const jobData = await new JobBuilder(DummyJob).timeout(100).enqueue();
    expect(jobData.timeout).toEqual(100);
  });

  test("enqueues a job setting args", async () => {
    const jobData = await new JobBuilder(DummyJob).enqueue("foo", "bar");
    expect(jobData.args).toEqual(["foo", "bar"]);
  });

  test("enqueues a job setting constructor args", async () => {
    const jobData = await new JobBuilder(DummyJob).with("foo", "bar").enqueue();
    expect(jobData.constructor_args).toEqual(["foo", "bar"]);
  });

  test("enqueues a job setting maxAttempts", async () => {
    const jobData = await new JobBuilder(DummyJob).maxAttempts(7).enqueue();
    expect(jobData.max_attempts).toEqual(7);
  });

  test("enqueues a job setting availableAt", async () => {
    const futureDate = new Date(Date.now() + 60_000);
    const jobData = await new JobBuilder(DummyJob).availableAt(futureDate).enqueue();
    expect(new Date(jobData.available_at as unknown as string).getTime()).toBeCloseTo(futureDate.getTime(), -2);
  });

  describe("constructor defaults", () => {
    test("uses default queue when no defaults provided", async () => {
      const jobData = await new JobBuilder(DummyJob).enqueue();
      expect(jobData.queue).toEqual("default");
    });

    test("uses default timeout when no defaults provided", async () => {
      const jobData = await new JobBuilder(DummyJob).enqueue();
      expect(jobData.timeout).toBeNull(); // undefined becomes null in the database
    });

    test("uses default maxAttempts when no defaults provided", async () => {
      const jobData = await new JobBuilder(DummyJob).enqueue();
      expect(jobData.max_attempts).toEqual(5);
    });

    test("uses default availableAt when no defaults provided", async () => {
      const beforeEnqueue = new Date();
      const jobData = await new JobBuilder(DummyJob).enqueue();
      const afterEnqueue = new Date();

      const availableAt = new Date(jobData.available_at as unknown as string);
      expect(availableAt.getTime()).toBeGreaterThanOrEqual(beforeEnqueue.getTime());
      expect(availableAt.getTime()).toBeLessThanOrEqual(afterEnqueue.getTime());
    });

    test("uses default uniqueness when no defaults provided", async () => {
      const jobData = await new JobBuilder(DummyJob).enqueue();
      expect(jobData.unique_digest).toBeNull(); // uniqueness is false by default, so no digest
    });
  });

  describe("constructor defaults with custom values", () => {
    test("uses custom queue default", async () => {
      const defaults = { queue: "custom-default-queue" };
      const jobData = await new JobBuilder(DummyJob, defaults).enqueue();
      expect(jobData.queue).toEqual("custom-default-queue");
    });

    test("uses custom timeout default", async () => {
      const defaults = { timeout: 30000 };
      const jobData = await new JobBuilder(DummyJob, defaults).enqueue();
      expect(jobData.timeout).toEqual(30000);
    });

    test("uses custom maxAttempts default", async () => {
      const defaults = { maxAttempts: 3 };
      const jobData = await new JobBuilder(DummyJob, defaults).enqueue();
      expect(jobData.max_attempts).toEqual(3);
    });

    test("uses custom availableAt default", async () => {
      const customDate = new Date(Date.now() + 120_000);
      const defaults = { availableAt: customDate };
      const jobData = await new JobBuilder(DummyJob, defaults).enqueue();
      expect(new Date(jobData.available_at as unknown as string).getTime()).toBeCloseTo(customDate.getTime(), -2);
    });

    test("uses custom uniqueness default (boolean true)", async () => {
      const defaults = { uniqueness: true as const };
      const jobData = await new JobBuilder(DummyJob, defaults).enqueue();
      expect(jobData.unique_digest).toBeTruthy(); // uniqueness is enabled, so digest should exist
    });

    test("uses custom uniqueness default (object with withArgs)", async () => {
      const defaults = { uniqueness: { withArgs: true } };
      const jobData = await new JobBuilder(DummyJob, defaults).enqueue();
      expect(jobData.unique_digest).toBeTruthy(); // uniqueness is enabled, so digest should exist
    });

    test("uses custom uniqueness default (object with period)", async () => {
      const defaults = { uniqueness: { period: "hour" as const } };
      const jobData = await new JobBuilder(DummyJob, defaults).enqueue();
      expect(jobData.unique_digest).toBeTruthy(); // uniqueness is enabled, so digest should exist
    });
  });

  describe("method calls override constructor defaults", () => {
    test("queue() method overrides default queue", async () => {
      const defaults = { queue: "default-queue" };
      const jobData = await new JobBuilder(DummyJob, defaults).queue("override-queue").enqueue();
      expect(jobData.queue).toEqual("override-queue");
    });

    test("timeout() method overrides default timeout", async () => {
      const defaults = { timeout: 10000 };
      const jobData = await new JobBuilder(DummyJob, defaults).timeout(20000).enqueue();
      expect(jobData.timeout).toEqual(20000);
    });

    test("maxAttempts() method overrides default maxAttempts", async () => {
      const defaults = { maxAttempts: 3 };
      const jobData = await new JobBuilder(DummyJob, defaults).maxAttempts(7).enqueue();
      expect(jobData.max_attempts).toEqual(7);
    });

    test("availableAt() method overrides default availableAt", async () => {
      const defaultDate = new Date(Date.now() + 60_000);
      const overrideDate = new Date(Date.now() + 120_000);
      const defaults = { availableAt: defaultDate };
      const jobData = await new JobBuilder(DummyJob, defaults).availableAt(overrideDate).enqueue();
      expect(new Date(jobData.available_at as unknown as string).getTime()).toBeCloseTo(overrideDate.getTime(), -2);
    });

    test("unique() method overrides default uniqueness (false to true)", async () => {
      const defaults = { uniqueness: false as const };
      const jobData = await new JobBuilder(DummyJob, defaults).unique(true).enqueue();
      expect(jobData.unique_digest).toBeTruthy(); // uniqueness is enabled, so digest should exist
    });

    test("unique() method overrides default uniqueness (true to false)", async () => {
      const defaults = { uniqueness: true as const };
      const jobData = await new JobBuilder(DummyJob, defaults).unique(false).enqueue();
      expect(jobData.unique_digest).toBeNull(); // uniqueness is disabled, so no digest
    });

    test("unique() method overrides default uniqueness (object)", async () => {
      const defaults = { uniqueness: false as const };
      const jobData = await new JobBuilder(DummyJob, defaults).unique({ withArgs: true, period: "minute" }).enqueue();
      expect(jobData.unique_digest).toBeTruthy(); // uniqueness is enabled, so digest should exist
    });
  });
});
