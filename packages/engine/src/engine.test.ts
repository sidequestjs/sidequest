import { sidequestTest } from "@/tests/fixture";
import { describe, expect, vi } from "vitest";
import { Engine } from "./engine";
import { MANUAL_SCRIPT_TAG } from "./shared-runner";
import { DummyJob } from "./test-jobs/dummy-job";

// Mock child_process globally to avoid worker fork issues in tests
vi.mock("child_process", () => ({
  fork: vi.fn().mockReturnValue({
    pid: 12345,
    on: vi.fn((event: string, callback: (message?: string) => void) => {
      if (event === "message") {
        // Immediately call the ready callback
        setTimeout(() => callback("ready"), 10);
      } else if (event === "exit") {
        setTimeout(() => callback(), 10);
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
        idleWorkerTimeout: 600,
        manualJobResolution: true,
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
      expect(config.idleWorkerTimeout).toBe(600);
      expect(config.manualJobResolution).toBe(true);

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

    sidequestTest("should throw error when maxConcurrentJobs is less than 1", async () => {
      const engine = new Engine();

      await expect(() =>
        engine.configure({
          maxConcurrentJobs: 0,
        }),
      ).rejects.toThrowError(`Invalid "maxConcurrentJobs" value: must be at least 1.`);

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

  describe("start", () => {
    sidequestTest("should start engine with default configuration", async () => {
      const engine = new Engine();

      await engine.start({
        backend: { driver: "@sidequest/sqlite-backend", config: ":memory:" },
      });

      expect(engine.getConfig()).toBeDefined();
      expect(engine.getBackend()).toBeDefined();

      await engine.close();
    });

    sidequestTest("should start engine with custom configuration", async () => {
      const engine = new Engine();
      const customConfig = {
        backend: { driver: "@sidequest/sqlite-backend", config: ":memory:" },
        queues: [{ name: "test-queue", concurrency: 3 }],
        maxConcurrentJobs: 15,
        logger: { level: "debug" as const, json: false },
        gracefulShutdown: false,
      };

      await engine.start(customConfig);

      const config = engine.getConfig();
      expect(config).toBeDefined();
      expect(config!.backend.config).toBe(":memory:");
      expect(config!.queues).toHaveLength(1);
      expect(config!.queues[0].name).toBe("test-queue");
      expect(config!.maxConcurrentJobs).toBe(15);
      expect(config!.logger.level).toBe("debug");
      expect(config!.gracefulShutdown).toBe(false);

      await engine.close();
    });

    sidequestTest("should warn when starting already started engine", async () => {
      const engine = new Engine();
      const config = {
        backend: { driver: "@sidequest/sqlite-backend", config: ":memory:" },
      };

      const configSpy = vi.spyOn(engine, "configure");

      await engine.start(config);

      // Try to start again
      await engine.start(config);

      // Should not crash and should warn
      expect(engine.getConfig()).toBeDefined();
      expect(configSpy).toHaveBeenCalledTimes(1);
      await engine.close();
    });

    sidequestTest("should use config from configure when start is called after configure", async () => {
      const engine = new Engine();

      // First configure the engine with specific settings
      const configureConfig = {
        backend: { driver: "@sidequest/sqlite-backend", config: ":memory:" },
        maxConcurrentJobs: 25,
        logger: { level: "warn" as const, json: true },
        skipMigration: false,
        gracefulShutdown: true,
      };

      await engine.configure(configureConfig);

      // Then try to start with different settings
      const startConfig = {
        backend: { driver: "@sidequest/sqlite-backend", config: "different.db" },
        maxConcurrentJobs: 10,
        logger: { level: "debug" as const, json: false },
        skipMigration: true,
        gracefulShutdown: false,
      };

      await engine.start(startConfig);

      // Should use the config from configure(), not from start()
      const finalConfig = engine.getConfig();
      expect(finalConfig).toBeDefined();
      expect(finalConfig!.maxConcurrentJobs).toBe(25); // From configure
      expect(finalConfig!.logger.level).toBe("warn"); // From configure
      expect(finalConfig!.logger.json).toBe(true); // From configure
      expect(finalConfig!.skipMigration).toBe(false); // From configure
      expect(finalConfig!.gracefulShutdown).toBe(true); // From configure

      // Should NOT use the values from start()
      expect(finalConfig!.maxConcurrentJobs).not.toBe(10);
      expect(finalConfig!.logger.level).not.toBe("debug");
      expect(finalConfig!.logger.json).not.toBe(false);
      expect(finalConfig!.skipMigration).not.toBe(true);
      expect(finalConfig!.gracefulShutdown).not.toBe(false);

      await engine.close();
    });

    sidequestTest("should create queues when provided in config", async () => {
      const engine = new Engine();
      const queues = [
        { name: "high-priority", concurrency: 5, priority: 10 },
        { name: "low-priority", concurrency: 2, priority: 1 },
      ];

      await engine.start({
        backend: { driver: "@sidequest/sqlite-backend", config: ":memory:" },
        queues,
      });

      const backend = engine.getBackend();
      expect(backend).toBeDefined();

      // Verify queues were created
      const createdQueues = await backend!.listQueues();
      const queueNames = createdQueues.map((q) => q.name).sort();
      expect(queueNames).toContain("high-priority");
      expect(queueNames).toContain("low-priority");

      await engine.close();
    });

    sidequestTest("should apply queue defaults when creating queues", async () => {
      const engine = new Engine();
      const queueDefaults = {
        concurrency: 8,
        priority: 3,
        state: "active" as const,
      };

      await engine.start({
        backend: { driver: "@sidequest/sqlite-backend", config: ":memory:" },
        queues: [{ name: "test-queue" }], // No explicit config, should use defaults
        queueDefaults,
      });

      const backend = engine.getBackend();
      const queues = await backend!.listQueues();
      const testQueue = queues.find((q) => q.name === "test-queue");

      expect(testQueue).toBeDefined();
      expect(testQueue!.concurrency).toBe(8);
      expect(testQueue!.priority).toBe(3);
      expect(testQueue!.state).toBe("active");

      await engine.close();
    });

    sidequestTest("should enable graceful shutdown by default", async () => {
      const engine = new Engine();

      await engine.start({
        backend: { driver: "@sidequest/sqlite-backend", config: ":memory:" },
      });

      const config = engine.getConfig();
      expect(config!.gracefulShutdown).toBe(true);

      await engine.close();
    });

    sidequestTest("should allow disabling graceful shutdown", async () => {
      const engine = new Engine();

      await engine.start({
        backend: { driver: "@sidequest/sqlite-backend", config: ":memory:" },
        gracefulShutdown: false,
      });

      const config = engine.getConfig();
      expect(config!.gracefulShutdown).toBe(false);

      await engine.close();
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

  describe("manualJobResolution", () => {
    sidequestTest("should configure engine with manualJobResolution enabled", async () => {
      const engine = new Engine();
      const config = await engine.configure({
        backend: { driver: "@sidequest/sqlite-backend", config: ":memory:" },
        manualJobResolution: true,
      });

      expect(config.manualJobResolution).toBe(true);

      await engine.close();
    });

    sidequestTest("should have manualJobResolution default to false", async () => {
      const engine = new Engine();
      const config = await engine.configure({
        backend: { driver: "@sidequest/sqlite-backend", config: ":memory:" },
      });

      expect(config.manualJobResolution).toBe(false);

      await engine.close();
    });

    sidequestTest("should start engine with manualJobResolution enabled", async () => {
      const engine = new Engine();

      await engine.start({
        backend: { driver: "@sidequest/sqlite-backend", config: ":memory:" },
        manualJobResolution: true,
      });

      const config = engine.getConfig();
      expect(config!.manualJobResolution).toBe(true);

      await engine.close();
    });

    sidequestTest("should build jobs with manual resolution when enabled", async () => {
      const engine = new Engine();
      await engine.configure({
        backend: { driver: "@sidequest/sqlite-backend", config: ":memory:" },
        manualJobResolution: true,
      });

      const jobBuilder = engine.build(DummyJob);
      const job = await jobBuilder.enqueue();

      expect(job.script).toBe(MANUAL_SCRIPT_TAG);

      await engine.close();
    });

    sidequestTest("should allow job builder customization when manualJobResolution is true", async () => {
      const engine = new Engine();
      await engine.configure({
        backend: { driver: "@sidequest/sqlite-backend", config: ":memory:" },
        manualJobResolution: true,
      });

      const customQueue = "manual-custom-queue";
      const customMaxAttempts = 8;
      const customTimeout = 45000;

      const job = await engine
        .build(DummyJob)
        .queue(customQueue)
        .maxAttempts(customMaxAttempts)
        .timeout(customTimeout)
        .enqueue();

      expect(job.script).toBe(MANUAL_SCRIPT_TAG);
      expect(job.queue).toBe(customQueue);
      expect(job.max_attempts).toBe(customMaxAttempts);
      expect(job.timeout).toBe(customTimeout);

      await engine.close();
    });

    sidequestTest("should handle job uniqueness when manualJobResolution is true", async () => {
      const engine = new Engine();
      await engine.configure({
        backend: { driver: "@sidequest/sqlite-backend", config: ":memory:" },
        manualJobResolution: true,
      });

      const job1 = await engine.build(DummyJob).unique(true).enqueue();

      expect(job1.script).toBe(MANUAL_SCRIPT_TAG);
      expect(job1.unique_digest).toBeTruthy();
      expect(job1.uniqueness_config).toEqual({
        type: "alive-job",
        withArgs: false,
      });

      // Should not be able to enqueue duplicate
      await expect(engine.build(DummyJob).unique(true).enqueue()).rejects.toThrow();

      await engine.close();
    });

    sidequestTest("should not interfere with normal job resolution when manualJobResolution is false", async () => {
      const engine = new Engine();
      await engine.configure({
        backend: { driver: "@sidequest/sqlite-backend", config: ":memory:" },
        manualJobResolution: false, // explicitly set to false
      });

      const job = await engine.build(DummyJob).enqueue();

      expect(job.script).not.toBe(MANUAL_SCRIPT_TAG);
      expect(job.script).toMatch(/dummy-job\.js$/);

      await engine.close();
    });

    sidequestTest("should switch to manual resolution after reconfiguration", async () => {
      const engine = new Engine();

      // First configure without manual resolution
      await engine.configure({
        backend: { driver: "@sidequest/sqlite-backend", config: ":memory:" },
        manualJobResolution: false,
      });

      const job1 = await engine.build(DummyJob).enqueue();
      expect(job1.script).not.toBe(MANUAL_SCRIPT_TAG);

      // Close and reconfigure with manual resolution
      await engine.close();
      await engine.configure({
        backend: { driver: "@sidequest/sqlite-backend", config: ":memory:" },
        manualJobResolution: true,
      });

      const job2 = await engine.build(DummyJob).enqueue();
      expect(job2.script).toBe(MANUAL_SCRIPT_TAG);

      await engine.close();
    });
  });
});
