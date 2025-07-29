import { sidequestTest, SidequestTestFixture } from "@/tests/fixture";
import { Backend } from "@sidequest/backend";
import { CompletedResult, JobData } from "@sidequest/core";
import EventEmitter from "events";
import { grantQueueConfig } from "../queue/grant-queue-config";
import { DummyJob } from "../test-jobs/dummy-job";
import { ExecutorManager } from "./executor-manager";

const runMock = vi.fn();

vi.mock("../shared-runner", () => ({
  RunnerPool: vi.fn().mockImplementation(() => ({
    run: runMock,
    destroy: vi.fn(),
  })),
}));

vi.mock("../job/job-transitioner", () => ({
  JobTransitioner: {
    apply: vi.fn().mockImplementation((backend: Backend, job: JobData) => job),
  },
}));

describe("ExecutorManager", () => {
  let jobData: JobData;

  beforeEach<SidequestTestFixture>(async ({ backend }) => {
    const job = new DummyJob();
    await job.ready();

    jobData = await backend.createNewJob({
      queue: "default",
      state: "waiting",
      script: job.script,
      class: job.className,
      args: [],
      constructor_args: [],
      attempt: 0,
      max_attempts: 1,
    });

    const completedJobResult: CompletedResult = {
      __is_job_transition__: true,
      type: "completed",
      result: "result",
    };
    runMock.mockResolvedValue(completedJobResult);
  });

  afterEach(() => {
    runMock.mockReset();
  });

  describe("execute", () => {
    sidequestTest("sends the job to the execution pool", async ({ backend, config }) => {
      const queryConfig = await grantQueueConfig(backend, { name: "default", concurrency: 1 });
      const executorManager = new ExecutorManager(backend, config);

      const execPromise = executorManager.execute(queryConfig, jobData);

      expect(executorManager.availableSlotsByQueue(queryConfig)).toEqual(0);
      expect(executorManager.availableSlotsGlobal()).toEqual(9);

      await execPromise;
      expect(runMock).toBeCalledWith(jobData, expect.any(EventEmitter));
      expect(executorManager.availableSlotsByQueue(queryConfig)).toEqual(1);
      expect(executorManager.availableSlotsGlobal()).toEqual(10);
      await executorManager.destroy();
    });

    sidequestTest("snoozes job when queue is full", async ({ backend, config }) => {
      const queryConfig = await grantQueueConfig(backend, { name: "default", concurrency: 0 }); // No available slots
      const executorManager = new ExecutorManager(backend, config);

      // Set up job in claimed state (as it would be when passed to execute)
      jobData = await backend.updateJob({ ...jobData, state: "claimed", claimed_at: new Date() });

      await executorManager.execute(queryConfig, jobData);

      // Verify the job runner was NOT called since the job was snoozed
      expect(runMock).not.toHaveBeenCalled();

      // Verify slots remain unchanged (no job was actually executed)
      expect(executorManager.availableSlotsByQueue(queryConfig)).toEqual(0);
      expect(executorManager.totalActiveWorkers()).toEqual(0);
      await executorManager.destroy();
    });

    sidequestTest("snoozes job when global slots are full", async ({ backend, config }) => {
      const queryConfig = await grantQueueConfig(backend, { name: "default", concurrency: 5 }); // Queue has slots
      const executorManager = new ExecutorManager(backend, { ...config, maxConcurrentJobs: 0 }); // But global max is 0

      // Set up job in claimed state
      jobData = await backend.updateJob({ ...jobData, state: "claimed", claimed_at: new Date() });

      await executorManager.execute(queryConfig, jobData);

      // Verify the job runner was NOT called
      expect(runMock).not.toHaveBeenCalled();

      // Verify global slots show as full
      expect(executorManager.availableSlotsGlobal()).toEqual(0);
      expect(executorManager.totalActiveWorkers()).toEqual(0);
      await executorManager.destroy();
    });
  });

  describe("availableSlotsByQueue", () => {
    sidequestTest("returns the available slots by queue", async ({ backend, config }) => {
      const queryConfig = await grantQueueConfig(backend, { name: "default", concurrency: 7 });
      const executorManager = new ExecutorManager(backend, config);
      expect(executorManager.availableSlotsByQueue(queryConfig)).toEqual(7);
      await executorManager.destroy();
    });

    sidequestTest("returns zero as min value", async ({ backend, config }) => {
      const queryConfig = await grantQueueConfig(backend, { name: "default", concurrency: 0 });
      const executorManager = new ExecutorManager(backend, config);

      void executorManager.execute(queryConfig, jobData);
      expect(executorManager.availableSlotsByQueue(queryConfig)).toEqual(0);
      await executorManager.destroy();
    });
  });

  describe("availableSlotsGlobal", () => {
    sidequestTest("returns the global available slots", async ({ backend, config }) => {
      const executorManager = new ExecutorManager(backend, config);
      expect(executorManager.availableSlotsGlobal()).toEqual(10);
      await executorManager.destroy();
    });

    sidequestTest("returns zero as min value", async ({ backend, config }) => {
      const queryConfig = await grantQueueConfig(backend, { name: "default", concurrency: 0 });
      const executorManager = new ExecutorManager(backend, { ...config, maxConcurrentJobs: 0 });

      void executorManager.execute(queryConfig, jobData);
      expect(executorManager.availableSlotsGlobal()).toEqual(0);
      await executorManager.destroy();
    });
  });

  describe("totalActiveWorkers", () => {
    sidequestTest("returns the available slots by queue", async ({ backend, config }) => {
      const queryConfig = await grantQueueConfig(backend, { name: "default", concurrency: 7 });
      const executorManager = new ExecutorManager(backend, config);

      expect(executorManager.totalActiveWorkers()).toEqual(0);

      jobData = await backend.updateJob({ ...jobData, state: "running" });

      const execPromise = executorManager.execute(queryConfig, jobData);
      await execPromise;
      expect(executorManager.totalActiveWorkers()).toEqual(0);
      await executorManager.destroy();
    });
  });
});
