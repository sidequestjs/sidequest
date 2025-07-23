import { CompletedResult, JobData } from "@sidequest/core";
import { Engine, SidequestConfig } from "../engine";
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
  const config: SidequestConfig = {
    backend: { driver: "@sidequest/sqlite-backend", config: dbLocation },
    maxConcurrentJobs: 5,
  };

  let jobData: JobData;

  beforeEach(async () => {
    await Engine.configure(config);

    const job = new DummyJob();
    await job.ready();

    jobData = await Engine.getBackend()!.createNewJob({
      queue: "default",
      state: "waiting",
      script: job.script!,
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
      const queryConfig = await grantQueueConfig("default", { name: "default", concurrency: 1 });
      const executorManager = new ExecutorManager(config);

      const execPromise = executorManager.execute(queryConfig!, jobData);
      expect(executorManager.availableSlotsByQueue(queryConfig!)).toEqual(0);
      expect(executorManager.availableSlotsGlobal()).toEqual(4);

      await execPromise;
      expect(runMock).toBeCalledWith(jobData);
      expect(executorManager.availableSlotsByQueue(queryConfig!)).toEqual(1);
      expect(executorManager.availableSlotsGlobal()).toEqual(5);
    });
  });

  describe("availableSlotsByQueue", () => {
    it("returns the available slots by queue", async () => {
      const queryConfig = await grantQueueConfig("default", { name: "default", concurrency: 7 });
      const executorManager = new ExecutorManager(config);
      expect(executorManager.availableSlotsByQueue(queryConfig!)).toEqual(7);
    });

    it("returns zero as min value", async () => {
      const queryConfig = await grantQueueConfig("default", { name: "default", concurrency: 0 });
      const executorManager = new ExecutorManager(config);
      void executorManager.execute(queryConfig!, jobData);
      expect(executorManager.availableSlotsByQueue(queryConfig!)).toEqual(0);
    });
  });

  describe("availableSlotsGlobal", () => {
    it("returns the global available slots", () => {
      const executorManager = new ExecutorManager(config);
      expect(executorManager.availableSlotsGlobal()).toEqual(5);
    });

    it("returns zero as min value", async () => {
      const queryConfig = await grantQueueConfig("default", { name: "default", concurrency: 0 });
      config.maxConcurrentJobs = 0;
      const executorManager = new ExecutorManager(config);
      void executorManager.execute(queryConfig!, jobData);
      expect(executorManager.availableSlotsGlobal()).toEqual(0);
    });
  });

  describe("totalActiveWorkers", () => {
    it("returns the available slots by queue", async () => {
      const queryConfig = await grantQueueConfig("default", { name: "default", concurrency: 7 });
      const executorManager = new ExecutorManager(config);
      expect(executorManager.totalActiveWorkers()).toEqual(0);
      const execPromise = executorManager.execute(queryConfig!, jobData);
      expect(executorManager.totalActiveWorkers()).toEqual(1);
      await execPromise;
      expect(executorManager.totalActiveWorkers()).toEqual(0);
    });
  });
});
