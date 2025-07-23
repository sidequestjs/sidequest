import { Backend } from "@sidequest/backend";
import { CompletedResult, JobData } from "@sidequest/core";
import EventEmitter from "events";
import { Engine, EngineConfig } from "../engine";
import { grantQueueConfig } from "../queue/grant-queue-config";
import { DummyJob } from "../test-jobs/dummy-job";
import { ExecutorManager } from "./executor-manager";

const runMock = vi.fn();

vi.mock("../shared-runner", () => ({
  RunnerPool: vi.fn().mockImplementation(() => ({
    run: runMock,
  })),
}));

vi.mock("../job/job-transitioner", () => ({
  JobTransitioner: {
    apply: vi.fn().mockImplementation((job: JobData) => job),
  },
}));

describe("ExecutorManager", () => {
  const dbLocation = ":memory:";
  const config: EngineConfig = {
    backend: { driver: "@sidequest/sqlite-backend", config: dbLocation },
    maxConcurrentJobs: 5,
  };

  let backend: Backend;
  let jobData: JobData;

  beforeEach(async () => {
    await Engine.configure(config);
    backend = Engine.getBackend()!;

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

  afterEach(async () => {
    await Engine.close();
    runMock.mockReset();
  });

  describe("execute", () => {
    it("sends the job to the execution pool", async () => {
      const queryConfig = await grantQueueConfig(backend, { name: "default", concurrency: 1 });
      const executorManager = new ExecutorManager(backend, config.maxConcurrentJobs!, 2, 4);

      const execPromise = executorManager.execute(queryConfig, jobData);
      expect(executorManager.availableSlotsByQueue(queryConfig)).toEqual(0);
      expect(executorManager.availableSlotsGlobal()).toEqual(4);

      await execPromise;
      expect(runMock).toBeCalledWith(jobData, expect.any(EventEmitter));
      expect(executorManager.availableSlotsByQueue(queryConfig)).toEqual(1);
      expect(executorManager.availableSlotsGlobal()).toEqual(5);
    });

    it("snoozes job when queue is full", async () => {
      const queryConfig = await grantQueueConfig(backend, { name: "default", concurrency: 0 }); // No available slots
      const executorManager = new ExecutorManager(backend, config.maxConcurrentJobs!, 2, 4);

      // Set up job in claimed state (as it would be when passed to execute)
      jobData = await backend.updateJob({ ...jobData, state: "claimed", claimed_at: new Date() });

      await executorManager.execute(queryConfig, jobData);

      // Verify the job runner was NOT called since the job was snoozed
      expect(runMock).not.toHaveBeenCalled();

      // Verify slots remain unchanged (no job was actually executed)
      expect(executorManager.availableSlotsByQueue(queryConfig)).toEqual(0);
      expect(executorManager.totalActiveWorkers()).toEqual(0);
    });

    it("snoozes job when global slots are full", async () => {
      const queryConfig = await grantQueueConfig(backend, { name: "default", concurrency: 5 }); // Queue has slots
      const executorManager = new ExecutorManager(backend, 0, 2, 4); // But global max is 0

      // Set up job in claimed state
      jobData = await backend.updateJob({ ...jobData, state: "claimed", claimed_at: new Date() });

      await executorManager.execute(queryConfig, jobData);

      // Verify the job runner was NOT called
      expect(runMock).not.toHaveBeenCalled();

      // Verify global slots show as full
      expect(executorManager.availableSlotsGlobal()).toEqual(0);
      expect(executorManager.totalActiveWorkers()).toEqual(0);
    });
  });

  describe("availableSlotsByQueue", () => {
    it("returns the available slots by queue", async () => {
      const queryConfig = await grantQueueConfig(backend, { name: "default", concurrency: 7 });
      const executorManager = new ExecutorManager(backend, config.maxConcurrentJobs!, 2, 4);
      expect(executorManager.availableSlotsByQueue(queryConfig)).toEqual(7);
    });

    it("returns zero as min value", async () => {
      const queryConfig = await grantQueueConfig(backend, { name: "default", concurrency: 0 });
      const executorManager = new ExecutorManager(backend, config.maxConcurrentJobs!, 2, 4);
      void executorManager.execute(queryConfig, jobData);
      expect(executorManager.availableSlotsByQueue(queryConfig)).toEqual(0);
    });
  });

  describe("availableSlotsGlobal", () => {
    it("returns the global available slots", () => {
      const executorManager = new ExecutorManager(backend, config.maxConcurrentJobs!, 2, 4);
      expect(executorManager.availableSlotsGlobal()).toEqual(5);
    });

    it("returns zero as min value", async () => {
      const queryConfig = await grantQueueConfig(backend, { name: "default", concurrency: 0 });
      config.maxConcurrentJobs = 0;
      const executorManager = new ExecutorManager(backend, config.maxConcurrentJobs, 2, 4);
      void executorManager.execute(queryConfig, jobData);
      expect(executorManager.availableSlotsGlobal()).toEqual(0);
    });
  });

  describe("totalActiveWorkers", () => {
    it("returns the available slots by queue", async () => {
      const queryConfig = await grantQueueConfig(backend, { name: "default", concurrency: 7 });
      const executorManager = new ExecutorManager(backend, config.maxConcurrentJobs!, 2, 4);
      expect(executorManager.totalActiveWorkers()).toEqual(0);

      jobData = await backend.updateJob({ ...jobData, state: "running" });

      const execPromise = executorManager.execute(queryConfig, jobData);
      await execPromise;
      expect(executorManager.totalActiveWorkers()).toEqual(0);
    });
  });
});
