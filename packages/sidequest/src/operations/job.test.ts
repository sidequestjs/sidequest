import { Backend, NewJobData, UpdateJobData } from "@sidequest/backend";
import { CancelTransition, JobData, JobState, RerunTransition, SnoozeTransition } from "@sidequest/core";
import { Engine, EngineConfig, Job } from "@sidequest/engine";
import { JobOperations } from "./job";

// Mock JobTransitioner to control its behavior
const jobTransitionerApplyMock = vi.hoisted(() => vi.fn((jobData) => Promise.resolve(jobData)));
vi.mock("@sidequest/engine", async (importOriginal) => {
  return {
    ...(await importOriginal<typeof import("@sidequest/engine")>()),
    JobTransitioner: {
      apply: jobTransitionerApplyMock,
    },
  };
});

export class DummyJob extends Job {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(..._optional) {
    super();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  run(..._optional) {
    return "dummy job";
  }
}

describe("JobOperations", () => {
  const dbLocation = ":memory:";
  const config: EngineConfig = {
    backend: { driver: "@sidequest/sqlite-backend", config: dbLocation },
  };

  let backend: Backend;
  let jobData: JobData;
  let operations: JobOperations;

  beforeEach(async () => {
    await Engine.configure(config);
    backend = Engine.getBackend()!;
    operations = JobOperations.instance;

    const job = new DummyJob();
    await job.ready();

    jobData = await backend.createNewJob({
      queue: "default",
      state: "waiting",
      script: job.script!,
      class: job.className,
      args: ["test-arg"],
      constructor_args: [],
      attempt: 0,
      max_attempts: 3,
    });

    // Reset mock and set default implementation
    jobTransitionerApplyMock.mockReset();
    jobTransitionerApplyMock.mockImplementation((job: JobData) => Promise.resolve(job));
  });

  afterEach(async () => {
    try {
      await backend.truncate();
    } catch {
      // noop
    }
    await Engine.close();
  });

  describe("singleton pattern", () => {
    it("should return the same instance", () => {
      const instance1 = JobOperations.instance;
      const instance2 = JobOperations.instance;
      expect(instance1).toBe(instance2);
    });
  });

  describe("getBackend error handling", () => {
    it("should throw error when engine is not configured", async () => {
      await Engine.close();

      await expect(operations.get(1)).rejects.toThrow();
    });
  });

  describe("get", () => {
    it("should return job data when job exists", async () => {
      const result = await operations.get(jobData.id);

      expect(result).toEqual(jobData);
      expect(result!.id).toBe(jobData.id);
      expect(result!.class).toBe(jobData.class);
    });

    it("should return undefined when job does not exist", async () => {
      const result = await operations.get(99999);

      expect(result).toBeUndefined();
    });
  });

  describe("list", () => {
    it("should return all jobs when no filters provided", async () => {
      const result = await operations.list();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(jobData);
    });

    it("should filter jobs by state", async () => {
      // Create jobs with different states
      const completedJob = await backend.createNewJob({
        queue: "default",
        state: "waiting",
        script: "test.js",
        class: "TestJob",
        args: [],
        constructor_args: [],
        attempt: 0,
        max_attempts: 1,
      });
      await backend.updateJob({ id: completedJob.id, state: "completed" });

      const result = await operations.list({ state: "completed" });

      expect(result).toHaveLength(1);
      expect(result[0].state).toBe("completed");
    });

    it("should filter jobs by queue", async () => {
      // Create job in different queue
      await backend.createNewJob({
        queue: "other-queue",
        state: "waiting",
        script: "test.js",
        class: "TestJob",
        args: [],
        constructor_args: [],
        attempt: 0,
        max_attempts: 1,
      });

      const result = await operations.list({ queue: "other-queue" });

      expect(result).toHaveLength(1);
      expect(result[0].queue).toBe("other-queue");
    });

    it("should apply pagination", async () => {
      // Create additional jobs
      for (let i = 0; i < 5; i++) {
        await backend.createNewJob({
          queue: "default",
          state: "waiting",
          script: "test.js",
          class: `TestJob${i}`,
          args: [],
          constructor_args: [],
          attempt: 0,
          max_attempts: 1,
        });
      }

      const result = await operations.list({ limit: 2, offset: 1 });

      expect(result).toHaveLength(2);
    });
  });

  describe("count", () => {
    it("should return job counts", async () => {
      // Create jobs with different states
      await backend.createNewJob({
        queue: "default",
        state: "waiting",
        script: "test.js",
        class: "TestJob",
        args: [],
        constructor_args: [],
        attempt: 0,
        max_attempts: 1,
      });
      const completedJob = await backend.createNewJob({
        queue: "default",
        state: "waiting",
        script: "test.js",
        class: "TestJob",
        args: [],
        constructor_args: [],
        attempt: 0,
        max_attempts: 1,
      });
      await backend.updateJob({ id: completedJob.id, state: "completed" });

      const result = await operations.count();

      expect(result.waiting).toBe(2);
      expect(result.completed).toBe(1);
    });

    it("should apply time range filter", async () => {
      const timeRange = {
        from: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
        to: new Date(),
      };

      const result = await operations.count(timeRange);

      expect(result).toBeDefined();
      expect(typeof result.waiting).toBe("number");
    });
  });

  describe("countOverTime", () => {
    it("should return job counts over time", async () => {
      const result = await operations.countOverTime("12h");

      expect(Array.isArray(result)).toBe(true);
      if (result.length > 0) {
        expect(result[0]).toHaveProperty("timestamp");
        expect(result[0].timestamp).toBeInstanceOf(Date);
      }
    });
  });

  describe("findStale", () => {
    it("should find stale jobs", async () => {
      const result = await operations.findStale();

      expect(Array.isArray(result)).toBe(true);
    });

    it("should use custom thresholds", async () => {
      const result = await operations.findStale(60000, 30000);

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("deleteFinished", () => {
    it("should delete finished jobs before cutoff date", async () => {
      const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

      await expect(operations.deleteFinished(cutoffDate)).resolves.not.toThrow();
    });
  });

  describe("cancel", () => {
    it("should cancel an existing job using CancelTransition", async () => {
      const canceledJob = { ...jobData, state: "canceled" as JobState };
      jobTransitionerApplyMock.mockResolvedValue(canceledJob);

      const result = await operations.cancel(jobData.id);

      expect(jobTransitionerApplyMock).toHaveBeenCalledWith(jobData, expect.any(CancelTransition));
      expect(result.state).toBe("canceled");
    });

    it("should throw error when job not found", async () => {
      await expect(operations.cancel(99999)).rejects.toThrow("Job with ID 99999 not found");
    });
  });

  describe("run", () => {
    it("should run job with SnoozeTransition(0) when force is false", async () => {
      const snoozedJob = { ...jobData, available_at: new Date() };
      jobTransitionerApplyMock.mockResolvedValue(snoozedJob);

      await operations.run(jobData.id, false);

      expect(jobTransitionerApplyMock).toHaveBeenCalledWith(jobData, expect.objectContaining({ delay: 0 }));
      expect(jobTransitionerApplyMock).toHaveBeenCalledWith(jobData, expect.any(SnoozeTransition));
    });

    it("should run job with RerunTransition when force is true", async () => {
      const rerunJob = { ...jobData, state: "waiting" as JobState };
      jobTransitionerApplyMock.mockResolvedValue(rerunJob);

      await operations.run(jobData.id, true);

      expect(jobTransitionerApplyMock).toHaveBeenCalledWith(jobData, expect.any(RerunTransition));
    });

    it("should use force=false by default", async () => {
      const snoozedJob = { ...jobData, available_at: new Date() };
      jobTransitionerApplyMock.mockResolvedValue(snoozedJob);

      await operations.run(jobData.id);

      expect(jobTransitionerApplyMock).toHaveBeenCalledWith(jobData, expect.any(SnoozeTransition));
    });

    it("should throw error when job not found", async () => {
      await expect(operations.run(99999)).rejects.toThrow("Job with ID 99999 not found");
    });
  });

  describe("snooze", () => {
    it("should snooze job with specified delay", async () => {
      const delay = 5000;
      const snoozedJob = { ...jobData, available_at: new Date(Date.now() + delay) };
      jobTransitionerApplyMock.mockResolvedValue(snoozedJob);

      await operations.snooze(jobData.id, delay);

      expect(jobTransitionerApplyMock).toHaveBeenCalledWith(jobData, expect.objectContaining({ delay }));
      expect(jobTransitionerApplyMock).toHaveBeenCalledWith(jobData, expect.any(SnoozeTransition));
    });

    it("should throw error for negative delay", async () => {
      await expect(operations.snooze(jobData.id, -1000)).rejects.toThrow("Delay must be a non-negative number");
    });

    it("should allow zero delay", async () => {
      const snoozedJob = { ...jobData, available_at: new Date() };
      jobTransitionerApplyMock.mockResolvedValue(snoozedJob);

      await operations.snooze(jobData.id, 0);

      expect(jobTransitionerApplyMock).toHaveBeenCalledWith(jobData, expect.objectContaining({ delay: 0 }));
    });

    it("should throw error when job not found", async () => {
      await expect(operations.snooze(99999, 1000)).rejects.toThrow("Job with ID 99999 not found");
    });
  });

  describe("create", () => {
    it("should create a new job", async () => {
      const newJobData: NewJobData = {
        queue: "test-queue",
        state: "waiting",
        script: "test-script.js",
        class: "TestJob",
        args: ["arg1", "arg2"],
        constructor_args: [],
        attempt: 0,
        max_attempts: 5,
      };

      const result = await operations.create(newJobData);

      expect(result).toBeDefined();
      expect(result.queue).toBe("test-queue");
      expect(result.class).toBe("TestJob");
      expect(result.args).toEqual(["arg1", "arg2"]);
      expect(result.max_attempts).toBe(5);
    });
  });

  describe("update", () => {
    it("should update an existing job", async () => {
      const updateData: UpdateJobData = {
        id: jobData.id,
        max_attempts: 10,
        args: ["updated-arg"],
      };

      const result = await operations.update(updateData);

      expect(result.max_attempts).toBe(10);
      expect(result.args).toEqual(["updated-arg"]);
    });

    it("should throw error when job not found", async () => {
      const updateData: UpdateJobData = {
        id: 99999,
        max_attempts: 10,
      };

      await expect(operations.update(updateData)).rejects.toThrow("Job with ID 99999 not found");
    });
  });

  describe("integration tests", () => {
    it("should work with real transitions", async () => {
      // Remove mock to test with real JobTransitioner
      vi.resetAllMocks();

      // Create a job in waiting state
      const testJob = await backend.createNewJob({
        queue: "integration-test",
        state: "waiting",
        script: "test.js",
        class: "IntegrationTestJob",
        args: [],
        constructor_args: [],
        attempt: 0,
        max_attempts: 1,
      });

      // Test snoozing the job
      const snoozedJob = await operations.snooze(testJob.id, 1000);
      expect(snoozedJob.state).toBe("waiting");
      expect(snoozedJob.available_at).toBeInstanceOf(Date);

      // Verify the job was actually updated in the database
      const updatedJob = await backend.getJob(testJob.id);
      expect(updatedJob!.available_at).toEqual(snoozedJob.available_at);
    });
  });
});
