import { sidequestTest, SidequestTestFixture } from "@/tests/fixture";
import { Backend } from "@sidequest/backend";
import { CompletedResult, JobData } from "@sidequest/core";
import { EngineConfig, NonNullableEngineConfig } from "../engine";
import { DummyJob } from "../test-jobs/dummy-job";
import { Dispatcher } from "./dispatcher";
import { ExecutorManager } from "./executor-manager";
import { QueueManager } from "./queue-manager";

const runMock = vi.hoisted(() => vi.fn());

vi.mock("../shared-runner", () => ({
  RunnerPool: vi.fn(() => ({
    run: runMock,
    destroy: vi.fn(),
  })),
}));

async function createJob(backend: Backend, queue = "default") {
  const job = new DummyJob();
  await job.ready();
  await backend.createNewJob({
    queue: queue,
    state: "waiting",
    script: job.script,
    class: job.className,
    args: [],
    constructor_args: [],
    attempt: 0,
    max_attempts: 1,
  });
}

describe("Dispatcher", () => {
  const config: EngineConfig = {
    backend: { driver: "@sidequest/sqlite-backend" },
    queues: [{ name: "default", concurrency: 1 }],
    maxConcurrentJobs: 5,
  };

  beforeEach<SidequestTestFixture>(async ({ backend }) => {
    await createJob(backend);
    vi.resetAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("start", () => {
    sidequestTest("consumes waiting jobs", async ({ backend }) => {
      expect(await backend.listJobs({ state: "waiting" })).toHaveLength(1);

      const dispatcher = new Dispatcher(
        backend,
        new QueueManager(backend, config.queues!),
        new ExecutorManager(backend, config as NonNullableEngineConfig),
      );
      dispatcher.start();

      runMock.mockImplementationOnce(() => {
        return { type: "completed", result: "foo", __is_job_transition__: true } as CompletedResult;
      });

      await vi.waitUntil(async () => {
        const jobs = await backend.listJobs({ state: "waiting" });
        return jobs.length === 0;
      });

      await dispatcher.stop();
    });

    sidequestTest("does not claim job when there is no available slot for the queue", async ({ backend }) => {
      await createJob(backend, "default");

      expect(await backend.listJobs({ state: "waiting" })).toHaveLength(2);

      const executorManager = new ExecutorManager(backend, config as NonNullableEngineConfig);
      vi.spyOn(executorManager, "availableSlotsByQueue").mockResolvedValue(0);

      const mockClaim = vi.spyOn(backend, "claimPendingJob");

      const dispatcher = new Dispatcher(backend, new QueueManager(backend, config.queues!), executorManager);
      dispatcher.start();

      expect(mockClaim).not.toBeCalled();

      await dispatcher.stop();
    });

    sidequestTest("does not claim job when there is no available global slot", async ({ backend }) => {
      config.maxConcurrentJobs = 1;
      await createJob(backend, "other");

      expect(await backend.listJobs({ state: "waiting" })).toHaveLength(2);

      const dispatcher = new Dispatcher(
        backend,
        new QueueManager(backend, config.queues!),
        new ExecutorManager(backend, config as NonNullableEngineConfig),
      );
      dispatcher.start();

      runMock.mockImplementationOnce(() => {
        return { type: "completed", result: "foo", __is_job_transition__: true } as CompletedResult;
      });

      let jobs: JobData[];

      await vi.waitUntil(async () => {
        jobs = await backend.listJobs({ state: "waiting" });
        return jobs.length === 1;
      });

      expect(jobs!).toHaveLength(1);
      expect(jobs![0].queue).toEqual("other");

      await dispatcher.stop();
    });
  });
});
