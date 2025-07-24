import { sidequestTest } from "@/tests/fixture";
import { describe, expect, vi } from "vitest";
import { Engine } from "./engine";
import { DummyJob } from "./test-jobs/dummy-job";

// Mock child_process globally to avoid worker fork issues in tests
vi.mock("child_process", () => ({
  fork: vi.fn().mockReturnValue({
    pid: 12345,
    on: vi.fn((event: string, callback: (message: string) => void) => {
      if (event === "message") {
        // Immediately call the ready callback
        setTimeout(() => callback("ready"), 10);
      }
    }),
    send: vi.fn(),
  }),
}));

export class ParameterizedJob extends DummyJob {
  constructor(
    public param1: string,
    public param2: number,
  ) {
    super();
  }

  run(arg: string) {
    return `${this.param1}-${this.param2}-${arg}`;
  }
}

describe("Engine", () => {
  describe("configure", () => {
    sidequestTest("should configure engine with default values", async () => {
      const engine = new Engine();
      const config = await engine.configure();

      expect(config).toBeTruthy();

      await engine.close();
    });

    sidequestTest("should configure engine with custom values", async () => {
      const engine = new Engine();
      const customAvailableAt = new Date("2025-01-01");

      const config = await engine.configure({
        backend: { driver: "@sidequest/sqlite-backend", config: ":memory:" },
        queues: [{ name: "test-queue", concurrency: 5 }],
        logger: { level: "debug", json: true },
        maxConcurrentJobs: 20,
        skipMigration: false,
        releaseStaleJobsIntervalMin: 30,
        releaseStaleJobsMaxStaleMs: 15 * 60 * 1000,
        releaseStaleJobsMaxClaimedMs: 2 * 60 * 1000,
        cleanupFinishedJobsIntervalMin: 120,
        cleanupFinishedJobsOlderThan: 7 * 24 * 60 * 60 * 1000,
        gracefulShutdown: false,
        minThreads: 2,
        maxThreads: 8,
        jobDefaults: {
          queue: "custom-queue",
          maxAttempts: 3,
          availableAt: customAvailableAt,
          timeout: 30000,
          uniqueness: true,
        },
        queueDefaults: {
          concurrency: 10,
          priority: 5,
          state: "paused",
        },
      });

      expect(config.backend.config).toBe(":memory:");
      expect(config.queues).toHaveLength(1);
      expect(config.queues[0].name).toBe("test-queue");
      expect(config.logger.level).toBe("debug");
      expect(config.logger.json).toBe(true);
      expect(config.maxConcurrentJobs).toBe(20);
      expect(config.skipMigration).toBe(false);
      expect(config.releaseStaleJobsIntervalMin).toBe(30);
      expect(config.releaseStaleJobsMaxStaleMs).toBe(15 * 60 * 1000);
      expect(config.releaseStaleJobsMaxClaimedMs).toBe(2 * 60 * 1000);
      expect(config.cleanupFinishedJobsIntervalMin).toBe(120);
      expect(config.cleanupFinishedJobsOlderThan).toBe(7 * 24 * 60 * 60 * 1000);
      expect(config.gracefulShutdown).toBe(false);
      expect(config.minThreads).toBe(2);
      expect(config.maxThreads).toBe(8);
      expect(config.jobDefaults.queue).toBe("custom-queue");
      expect(config.jobDefaults.maxAttempts).toBe(3);
      expect(config.jobDefaults.availableAt).toEqual(customAvailableAt);
      expect(config.jobDefaults.timeout).toBe(30000);
      expect(config.jobDefaults.uniqueness).toBe(true);
      expect(config.queueDefaults.concurrency).toBe(10);
      expect(config.queueDefaults.priority).toBe(5);
      expect(config.queueDefaults.state).toBe("paused");

      await engine.close();
    });

    sidequestTest("should not reconfigure already configured engine", async ({ engine }) => {
      const firstConfig = engine.getConfig();
      const secondConfig = await engine.configure({
        maxConcurrentJobs: 25,
      });

      expect(firstConfig).toEqual(secondConfig);
      expect(secondConfig.maxConcurrentJobs).not.toBe(25);

      await engine.close();
    });

    sidequestTest("should configure queues during setup", async () => {
      const engine = new Engine();
      const queues = [
        { name: "high-priority", concurrency: 10, priority: 10 },
        { name: "low-priority", concurrency: 2, priority: 1 },
      ];

      await engine.configure({
        backend: { driver: "@sidequest/sqlite-backend", config: ":memory:" },
        queues,
      });

      const backend = engine.getBackend()!;

      // Verify queues were created in the backend
      const queueList = await backend.listQueues();
      expect(queueList.map((q) => q.name)).toContain("high-priority");
      expect(queueList.map((q) => q.name)).toContain("low-priority");

      await engine.close();
    });
  });

  describe("getConfig", () => {
    sidequestTest("should return undefined when not configured", async () => {
      const engine = new Engine();
      expect(engine.getConfig()).toBeUndefined();
      await engine.close();
    });

    sidequestTest("should return config when configured", async ({ engine }) => {
      expect(engine.getConfig()).toBeDefined();
      await engine.close();
    });
  });

  describe("getBackend", () => {
    sidequestTest("should return undefined when not configured", async () => {
      const engine = new Engine();
      expect(engine.getBackend()).toBeUndefined();
      await engine.close();
    });

    sidequestTest("should return backend when configured", async ({ engine }) => {
      expect(engine.getBackend()).toBeDefined();
      await engine.close();
    });
  });

  describe("build", () => {
    sidequestTest("should create JobBuilder for job class", ({ engine }) => {
      const jobBuilder = engine.build(DummyJob);
      expect(jobBuilder).toBeDefined();
      expect(typeof jobBuilder.enqueue).toBe("function");
    });

    sidequestTest("should throw error when engine not configured", async () => {
      const engine = new Engine();
      expect(() => engine.build(DummyJob)).toThrow();
      await engine.close();
    });

    sidequestTest("should throw error when engine is shutting down", async ({ engine }) => {
      // Start the shutdown process
      const closePromise = engine.close();

      expect(() => engine.build(DummyJob)).toThrow();

      // Wait for the close to complete
      await closePromise;
    });

    sidequestTest("should use job defaults from config", async ({ engine, config }) => {
      const jobBuilder = engine.build(DummyJob);
      const job = await jobBuilder.enqueue();

      expect(job.queue).toBe(config.jobDefaults.queue);
      expect(job.max_attempts).toBe(config.jobDefaults.maxAttempts);
      expect(job.timeout).toBe(null);
    });

    sidequestTest("should allow job builder customization", async ({ engine }) => {
      const customQueue = "custom-test-queue";
      const customMaxAttempts = 10;
      const customTimeout = 60000;

      const job = await engine
        .build(DummyJob)
        .queue(customQueue)
        .maxAttempts(customMaxAttempts)
        .timeout(customTimeout)
        .enqueue();

      expect(job.queue).toBe(customQueue);
      expect(job.max_attempts).toBe(customMaxAttempts);
      expect(job.timeout).toBe(customTimeout);
    });

    sidequestTest("should enqueue job with constructor arguments", async ({ engine }) => {
      const job = await engine.build(ParameterizedJob).with("test", 42).enqueue("hello");

      expect(job.constructor_args).toEqual(["test", 42]);
      expect(job.args).toEqual(["hello"]);
    });

    sidequestTest("should handle job uniqueness configuration", async ({ engine }) => {
      const job1 = await engine.build(DummyJob).unique(true).enqueue();

      expect(job1.unique_digest).toBeDefined();
      expect(job1.uniqueness_config).toEqual({
        type: "alive-job",
        withArgs: false,
      });

      vi.useFakeTimers();
      const job2 = await engine.build(DummyJob).unique({ withArgs: true, period: "second" }).enqueue();

      expect(job2.unique_digest).toBeDefined();
      expect(job2.uniqueness_config).toEqual({
        type: "fixed-window",
        period: "second",
        withArgs: true,
      });

      await expect(engine.build(DummyJob).unique({ withArgs: true, period: "second" }).enqueue()).rejects.toThrow();

      vi.advanceTimersByTime(1100); // Fast-forward time to trigger uniqueness check

      const job3 = await engine.build(DummyJob).unique({ withArgs: true, period: "second" }).enqueue();

      expect(job3.unique_digest).toBeDefined();
      expect(job3.uniqueness_config).toEqual({
        type: "fixed-window",
        period: "second",
        withArgs: true,
      });

      vi.useRealTimers();
    });

    sidequestTest("should handle availableAt configuration", async ({ engine }) => {
      const futureDate = new Date(Date.now() + 60000); // 1 minute from now

      const job = await engine.build(DummyJob).availableAt(futureDate).enqueue();

      expect(job.available_at.getTime()).toBe(futureDate.getTime());
    });
  });

  describe("close", () => {
    sidequestTest("should close engine properly", async ({ engine, backend }) => {
      const closeSpy = vi.spyOn(backend, "close");

      await engine.close();

      expect(closeSpy).toHaveBeenCalled();
      expect(engine.getConfig()).toBeUndefined();
      expect(engine.getBackend()).toBeUndefined();
    });

    sidequestTest("should handle multiple close calls gracefully", async ({ engine }) => {
      await engine.close();
      await engine.close(); // Should not throw

      expect(engine.getConfig()).toBeUndefined();
    });

    sidequestTest("should reset shutting down flag after close", async ({ engine }) => {
      await engine.close();

      // Should be able to configure again after close
      await engine.configure();
      expect(engine.getConfig()).toBeDefined();

      await engine.close();
    });
  });

  describe("integration", () => {
    sidequestTest("should handle complete job lifecycle", async ({ engine, backend }) => {
      // Enqueue a job
      const job = await engine.build(DummyJob).enqueue("test-arg");
      expect(job.state).toBe("waiting");

      // Verify job was created in backend
      const savedJob = await backend.getJob(job.id);
      expect(savedJob).toBeDefined();
      expect(savedJob!.class).toBe("DummyJob");
      expect(savedJob!.args).toEqual(["test-arg"]);

      // List jobs and verify it appears
      const jobs = await backend.listJobs({ jobClass: "DummyJob" });
      expect(jobs).toHaveLength(1);
      expect(jobs[0].id).toBe(job.id);
    });

    sidequestTest("should respect job defaults from engine config", async () => {
      const engine = new Engine();
      const customQueue = "integration-test";
      const customMaxAttempts = 7;

      await engine.configure({
        backend: { driver: "@sidequest/sqlite-backend", config: ":memory:" },
        jobDefaults: {
          queue: customQueue,
          maxAttempts: customMaxAttempts,
          availableAt: new Date(),
          timeout: 45000,
          uniqueness: false,
        },
      });

      const job = await engine.build(DummyJob).enqueue();

      expect(job.queue).toBe(customQueue);
      expect(job.max_attempts).toBe(customMaxAttempts);
      expect(job.timeout).toBe(45000);

      await engine.close();
    });

    sidequestTest("should handle job enqueueing with different configurations", async ({ engine }) => {
      // Enqueue job with default settings
      const defaultJob = await engine.build(DummyJob).enqueue();

      // Enqueue job with custom settings
      const customJob = await engine
        .build(DummyJob)
        .queue("custom-queue")
        .maxAttempts(3)
        .timeout(30000)
        .unique(true)
        .enqueue("custom-arg");

      expect(defaultJob.queue).toBe("default");
      expect(defaultJob.max_attempts).toBe(5);
      expect(defaultJob.timeout).toBeNull();
      expect(defaultJob.unique_digest).toBeNull();

      expect(customJob.queue).toBe("custom-queue");
      expect(customJob.max_attempts).toBe(3);
      expect(customJob.timeout).toBe(30000);
      expect(customJob.unique_digest).toBeDefined();
    });

    sidequestTest("should handle engine reconfiguration correctly", async () => {
      const engine = new Engine();

      // First configuration
      const config1 = await engine.configure({
        maxConcurrentJobs: 10,
        backend: { driver: "@sidequest/sqlite-backend", config: ":memory:" },
      });

      expect(config1.maxConcurrentJobs).toBe(10);

      // Attempt to reconfigure (should return same config)
      const config2 = await engine.configure({
        maxConcurrentJobs: 20,
      });

      expect(config2.maxConcurrentJobs).toBe(10); // Should remain the same
      expect(config1).toEqual(config2);

      // Close and reconfigure
      await engine.close();
      const config3 = await engine.configure({
        maxConcurrentJobs: 20,
      });

      expect(config3.maxConcurrentJobs).toBe(20); // Should be new value

      await engine.close();
    });
  });
});
