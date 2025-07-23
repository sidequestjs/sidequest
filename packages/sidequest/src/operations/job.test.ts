import { sidequestTest, SidequestTestFixture } from "@/tests/fixture";
import { NewJobData, UpdateJobData } from "@sidequest/backend";
import { CancelTransition, JobData, JobState, RerunTransition, SnoozeTransition } from "@sidequest/core";
import { Job } from "@sidequest/engine";
import { JobOperations } from "./job";

// Mock JobTransitioner to control its behavior
const jobTransitionerApplyMock = vi.hoisted(() => vi.fn((backend, jobData) => Promise.resolve(jobData)));
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
  let jobData: JobData;
  let operations: JobOperations;

  beforeEach<SidequestTestFixture>(async ({ backend }) => {
    operations = JobOperations.instance;
    operations.setBackend(backend);

    const job = new DummyJob();
    await job.ready();

    jobData = await backend.createNewJob({
      queue: "default",
      state: "waiting",
      script: job.script,
      class: job.className,
      args: ["test-arg"],
      constructor_args: [],
      attempt: 0,
      max_attempts: 3,
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
    // Reset mock and set default implementation
    jobTransitionerApplyMock.mockReset();
    jobTransitionerApplyMock.mockImplementation((job: JobData) => Promise.resolve(job));
  });

  describe("singleton pattern", () => {
    sidequestTest("should return the same instance", () => {
      const instance1 = JobOperations.instance;
      const instance2 = JobOperations.instance;
      expect(instance1).toBe(instance2);
    });
  });

  describe("getBackend error handling", () => {
    sidequestTest("should throw error when engine is not configured", async ({ engine, backend }) => {
      await backend.truncate();
      await engine.close();

      await expect(operations.get(1)).rejects.toThrow();
    });
  });

  describe("get", () => {
    sidequestTest("should return job data when job exists", async () => {
      const result = await operations.get(jobData.id);

      expect(result).toEqual(jobData);
      expect(result!.id).toBe(jobData.id);
      expect(result!.class).toBe(jobData.class);
    });

    sidequestTest("should return undefined when job does not exist", async () => {
      const result = await operations.get(99999);

      expect(result).toBeUndefined();
    });
  });

  describe("list", () => {
    sidequestTest("should return all jobs when no filters provided", async () => {
      const result = await operations.list();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(jobData);
    });

    sidequestTest("should filter jobs by state", async ({ backend }) => {
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

    sidequestTest("should filter jobs by queue", async ({ backend }) => {
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

    sidequestTest("should apply pagination", async ({ backend }) => {
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
    sidequestTest("should return job counts", async ({ backend }) => {
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

    sidequestTest("should apply time range filter", async () => {
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
    sidequestTest("should return job counts over time", async () => {
      const result = await operations.countOverTime("12h");

      expect(Array.isArray(result)).toBe(true);
      if (result.length > 0) {
        expect(result[0]).toHaveProperty("timestamp");
        expect(result[0].timestamp).toBeInstanceOf(Date);
      }
    });
  });

  describe("findStale", () => {
    sidequestTest("should find stale jobs", async () => {
      const result = await operations.findStale();

      expect(Array.isArray(result)).toBe(true);
    });

    sidequestTest("should use custom thresholds", async () => {
      const result = await operations.findStale(60000, 30000);

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("deleteFinished", () => {
    sidequestTest("should delete finished jobs before cutoff date", async () => {
      const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

      await expect(operations.deleteFinished(cutoffDate)).resolves.not.toThrow();
    });
  });

  describe("cancel", () => {
    sidequestTest("should cancel an existing job using CancelTransition", async ({ backend }) => {
      const canceledJob = { ...jobData, state: "canceled" as JobState };
      jobTransitionerApplyMock.mockResolvedValue(canceledJob);

      const result = await operations.cancel(jobData.id);

      expect(jobTransitionerApplyMock).toHaveBeenCalledWith(backend, jobData, expect.any(CancelTransition));
      expect(result.state).toBe("canceled");
    });

    sidequestTest("should throw error when job not found", async () => {
      await expect(operations.cancel(99999)).rejects.toThrow("Job with ID 99999 not found");
    });
  });

  describe("run", () => {
    sidequestTest("should run job with SnoozeTransition(0) when force is false", async ({ backend }) => {
      const snoozedJob = { ...jobData, available_at: new Date() };
      jobTransitionerApplyMock.mockResolvedValue(snoozedJob);

      await operations.run(jobData.id, false);

      expect(jobTransitionerApplyMock).toHaveBeenCalledWith(backend, jobData, expect.objectContaining({ delay: 0 }));
      expect(jobTransitionerApplyMock).toHaveBeenCalledWith(backend, jobData, expect.any(SnoozeTransition));
    });

    sidequestTest("should run job with RerunTransition when force is true", async ({ backend }) => {
      const rerunJob = { ...jobData, state: "waiting" as JobState };
      jobTransitionerApplyMock.mockResolvedValue(rerunJob);

      await operations.run(jobData.id, true);

      expect(jobTransitionerApplyMock).toHaveBeenCalledWith(backend, jobData, expect.any(RerunTransition));
    });

    sidequestTest("should use force=false by default", async ({ backend }) => {
      const snoozedJob = { ...jobData, available_at: new Date() };
      jobTransitionerApplyMock.mockResolvedValue(snoozedJob);

      await operations.run(jobData.id);

      expect(jobTransitionerApplyMock).toHaveBeenCalledWith(backend, jobData, expect.any(SnoozeTransition));
    });

    sidequestTest("should throw error when job not found", async () => {
      await expect(operations.run(99999)).rejects.toThrow("Job with ID 99999 not found");
    });
  });

  describe("snooze", () => {
    sidequestTest("should snooze job with specified delay", async ({ backend }) => {
      const delay = 5000;
      const snoozedJob = { ...jobData, available_at: new Date(Date.now() + delay) };
      jobTransitionerApplyMock.mockResolvedValue(snoozedJob);

      await operations.snooze(jobData.id, delay);

      expect(jobTransitionerApplyMock).toHaveBeenCalledWith(backend, jobData, expect.objectContaining({ delay }));
      expect(jobTransitionerApplyMock).toHaveBeenCalledWith(backend, jobData, expect.any(SnoozeTransition));
    });

    sidequestTest("should throw error for negative delay", async () => {
      await expect(operations.snooze(jobData.id, -1000)).rejects.toThrow("Delay must be a non-negative number");
    });

    sidequestTest("should allow zero delay", async ({ backend }) => {
      const snoozedJob = { ...jobData, available_at: new Date() };
      jobTransitionerApplyMock.mockResolvedValue(snoozedJob);

      await operations.snooze(jobData.id, 0);

      expect(jobTransitionerApplyMock).toHaveBeenCalledWith(backend, jobData, expect.objectContaining({ delay: 0 }));
    });

    sidequestTest("should throw error when job not found", async () => {
      await expect(operations.snooze(99999, 1000)).rejects.toThrow("Job with ID 99999 not found");
    });
  });

  describe("create", () => {
    sidequestTest("should create a new job", async () => {
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
    sidequestTest("should update an existing job", async () => {
      const updateData: UpdateJobData = {
        id: jobData.id,
        max_attempts: 10,
        args: ["updated-arg"],
      };

      const result = await operations.update(updateData);

      expect(result.max_attempts).toBe(10);
      expect(result.args).toEqual(["updated-arg"]);
    });

    sidequestTest("should throw error when job not found", async () => {
      const updateData: UpdateJobData = {
        id: 99999,
        max_attempts: 10,
      };

      await expect(operations.update(updateData)).rejects.toThrow("Job with ID 99999 not found");
    });
  });

  describe("integration tests", () => {
    sidequestTest("should work with real transitions", async ({ backend }) => {
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
