import { sidequestTest, SidequestTestFixture } from "@/tests/fixture";
import { Backend } from "@sidequest/backend";
import { CompletedResult, CompleteTransition, JobData, RetryTransition, RunTransition } from "@sidequest/core";
import { JobTransitioner } from "../job/job-transitioner";
import { grantQueueConfig } from "../queue/grant-queue-config";
import { DummyJob } from "../test-jobs/dummy-job";
import { ExecutorManager } from "./executor-manager";

const runMock = vi.hoisted(() => vi.fn());
const inlineRunMock = vi.hoisted(() => vi.fn());

vi.mock("../shared-runner", () => ({
  RunnerPool: vi.fn().mockImplementation(function () {
    return {
      run: runMock,
      destroy: vi.fn(),
    };
  }),
  InlineRunner: vi.fn().mockImplementation(function () {
    return {
      run: inlineRunMock,
      destroy: vi.fn(),
    };
  }),
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
      expect(runMock).toBeCalledWith(jobData, expect.any(AbortSignal));
      expect(executorManager.availableSlotsByQueue(queryConfig)).toEqual(1);
      expect(executorManager.availableSlotsGlobal()).toEqual(10);
      await executorManager.destroy();
    });

    sidequestTest("uses the inline runner when runner is 'inline'", async ({ backend, config }) => {
      inlineRunMock.mockResolvedValue({
        __is_job_transition__: true,
        type: "completed",
        result: "result",
      } satisfies CompletedResult);
      const queryConfig = await grantQueueConfig(backend, { name: "default", concurrency: 1 });
      const executorManager = new ExecutorManager(backend, { ...config, runner: "inline" });

      await executorManager.execute(queryConfig, jobData);

      expect(inlineRunMock).toBeCalledWith(jobData, expect.any(AbortSignal));
      expect(runMock).not.toHaveBeenCalled();
      await executorManager.destroy();
      inlineRunMock.mockReset();
    });

    sidequestTest(
      "inline: a job that ignores the timeout completes instead of being retried",
      async ({ backend, config }) => {
        jobData = await backend.updateJob({ ...jobData, state: "claimed", claimed_at: new Date(), timeout: 20 });
        const queryConfig = await grantQueueConfig(backend, { name: "default", concurrency: 1 });
        const executorManager = new ExecutorManager(backend, { ...config, runner: "inline" });

        // The job ignores the abort signal and completes after the timeout has already fired.
        inlineRunMock.mockImplementationOnce(
          () =>
            new Promise((resolve) =>
              setTimeout(() => resolve({ __is_job_transition__: true, type: "completed", result: "done" }), 60),
            ),
        );

        await executorManager.execute(queryConfig, jobData);

        // Timeout fired (signal aborted) but inline applies the job's own result: completed, not a retry.
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(JobTransitioner.apply).toHaveBeenCalledWith(backend, jobData, expect.any(CompleteTransition));
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(JobTransitioner.apply).not.toHaveBeenCalledWith(backend, jobData, expect.any(RetryTransition));
        await executorManager.destroy();
        inlineRunMock.mockReset();
      },
    );

    sidequestTest(
      "inline: a job that ignores cancellation completes (its result wins)",
      async ({ backend, config }) => {
        // Pre-cancel in the DB so the first cancellation poll observes it immediately. JobTransitioner is
        // mocked here, so the RunTransition does not overwrite the persisted state.
        jobData = await backend.updateJob({ ...jobData, state: "canceled" });
        const queryConfig = await grantQueueConfig(backend, { name: "default", concurrency: 1 });
        const executorManager = new ExecutorManager(backend, { ...config, runner: "inline" });

        inlineRunMock.mockResolvedValue({ __is_job_transition__: true, type: "completed", result: "done" });

        await executorManager.execute(queryConfig, jobData);

        // Inline cannot force-stop the job; it completed, so its result is applied.
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(JobTransitioner.apply).toHaveBeenCalledWith(backend, jobData, expect.any(CompleteTransition));
        await executorManager.destroy();
        inlineRunMock.mockReset();
      },
    );

    sidequestTest("should abort job execution on job cancel", async ({ backend, config }) => {
      await backend.updateJob({ ...jobData, state: "claimed", claimed_at: new Date() });

      const queryConfig = await grantQueueConfig(backend, { name: "default", concurrency: 1 });
      const executorManager = new ExecutorManager(backend, config);

      let expectedPromise;
      runMock.mockImplementationOnce(async (job: JobData, signal: AbortSignal) => {
        const promise = new Promise((_, reject) => {
          signal.addEventListener("abort", () => {
            reject(new Error("The task has been aborted"));
          });
        });
        await backend.updateJob({ ...job, state: "canceled" });
        expectedPromise = promise;
        return promise;
      });

      const execPromise = executorManager.execute(queryConfig, jobData);

      expect(executorManager.availableSlotsByQueue(queryConfig)).toEqual(0);
      expect(executorManager.availableSlotsGlobal()).toEqual(9);

      await execPromise;
      expect(runMock).toBeCalledWith(jobData, expect.any(AbortSignal));
      expect(runMock).toHaveReturnedWith(expectedPromise);
      await expect(expectedPromise).rejects.toThrow("The task has been aborted");
      expect(executorManager.availableSlotsByQueue(queryConfig)).toEqual(1);
      expect(executorManager.availableSlotsGlobal()).toEqual(10);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(JobTransitioner.apply).toHaveBeenCalledWith(backend, jobData, expect.any(RunTransition));
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(JobTransitioner.apply).not.toHaveBeenCalledWith(backend, jobData, expect.any(RetryTransition));

      await executorManager.destroy();
    });

    sidequestTest(
      "does not overwrite the canceled state when an aborted job ignores the signal",
      async ({ backend, config }) => {
        await backend.updateJob({ ...jobData, state: "claimed", claimed_at: new Date() });

        const queryConfig = await grantQueueConfig(backend, { name: "default", concurrency: 1 });
        const executorManager = new ExecutorManager(backend, config);

        // The job is canceled mid-run but ignores the abort signal and runs to completion.
        runMock.mockImplementationOnce(async (job: JobData, signal: AbortSignal) => {
          await backend.updateJob({ ...job, state: "canceled" });
          while (!signal.aborted) {
            await new Promise((r) => setTimeout(r, 50));
          }
          return { __is_job_transition__: true, type: "completed", result: "result" } as CompletedResult;
        });

        await executorManager.execute(queryConfig, jobData);

        // The terminal completion transition must be skipped so the canceled state is preserved.
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(JobTransitioner.apply).not.toHaveBeenCalledWith(
          backend,
          expect.anything(),
          expect.any(CompleteTransition),
        );

        await executorManager.destroy();
      },
    );

    sidequestTest("should abort job execution on timeout", async ({ backend, config }) => {
      jobData = await backend.updateJob({ ...jobData, state: "claimed", claimed_at: new Date(), timeout: 100 });

      const queryConfig = await grantQueueConfig(backend, { name: "default", concurrency: 1 });
      const executorManager = new ExecutorManager(backend, config);

      let expectedPromise;
      runMock.mockImplementationOnce(async (job: JobData, signal: AbortSignal) => {
        const promise = new Promise((_, reject) => {
          signal.addEventListener("abort", () => {
            reject(new Error("The task has been aborted"));
          });
        });
        expectedPromise = promise;
        return promise;
      });

      const execPromise = executorManager.execute(queryConfig, jobData);

      expect(executorManager.availableSlotsByQueue(queryConfig)).toEqual(0);
      expect(executorManager.availableSlotsGlobal()).toEqual(9);

      await execPromise;
      expect(runMock).toBeCalledWith(jobData, expect.any(AbortSignal));
      expect(runMock).toHaveReturnedWith(expectedPromise);
      await expect(expectedPromise).rejects.toThrow("The task has been aborted");
      expect(executorManager.availableSlotsByQueue(queryConfig)).toEqual(1);
      expect(executorManager.availableSlotsGlobal()).toEqual(10);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(JobTransitioner.apply).toHaveBeenCalledWith(backend, jobData, expect.any(RunTransition));
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(JobTransitioner.apply).toHaveBeenCalledWith(backend, jobData, expect.any(RetryTransition));

      await executorManager.destroy();
    });

    sidequestTest("should retry when unhandled error", async ({ backend, config }) => {
      await backend.updateJob({ ...jobData, state: "claimed", claimed_at: new Date() });

      const queryConfig = await grantQueueConfig(backend, { name: "default", concurrency: 1 });
      const executorManager = new ExecutorManager(backend, config);

      runMock.mockImplementationOnce(() => {
        throw new Error("Unhandled error during job execution");
      });

      const execPromise = executorManager.execute(queryConfig, jobData);

      expect(executorManager.availableSlotsByQueue(queryConfig)).toEqual(0);
      expect(executorManager.availableSlotsGlobal()).toEqual(9);

      await execPromise;
      expect(runMock).toBeCalledWith(jobData, expect.any(AbortSignal));
      expect(executorManager.availableSlotsByQueue(queryConfig)).toEqual(1);
      expect(executorManager.availableSlotsGlobal()).toEqual(10);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(JobTransitioner.apply).toHaveBeenCalledWith(backend, jobData, expect.any(RunTransition));
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(JobTransitioner.apply).toHaveBeenCalledWith(backend, jobData, expect.any(RetryTransition));

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
      const queryConfig = await grantQueueConfig(backend, { name: "default", concurrency: 1 });
      const executorManager = new ExecutorManager(backend, config);

      void executorManager.execute(queryConfig, jobData);
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
      const queryConfig = await grantQueueConfig(backend, { name: "default", concurrency: 1 });
      const executorManager = new ExecutorManager(backend, { ...config, maxConcurrentJobs: 1 });

      void executorManager.execute(queryConfig, jobData);
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
