import { sidequestTest, SidequestTestFixture } from "@/tests/fixture";
import { Backend } from "@sidequest/backend";
import { CompletedResult, JobData, QueueConfig } from "@sidequest/core";
import { EngineConfig } from "../engine";
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
  return await backend.createNewJob({
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
    queues: [
      { name: "default", concurrency: 1 },
      { name: "noop", concurrency: 0 },
    ],
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
        new ExecutorManager(backend, config.maxConcurrentJobs!, 2, 4),
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

    sidequestTest(
      "claim up to 20 jobs when the max concurency and job concurrency was unlimited",
      async ({ backend }) => {
        const claimSpy = vi.spyOn(backend, "claimPendingJob").mockResolvedValue([]);

        const dispatcher = new Dispatcher(
          backend,
          new QueueManager(backend, [{ name: "default", concurrency: 0 }]),
          new ExecutorManager(backend, 0, 2, 4),
        );

        dispatcher.start();

        await vi.waitUntil(() => {
          return claimSpy.mock.calls.length > 0;
        });

        expect(claimSpy).toHaveBeenCalledWith("default", 20);

        await dispatcher.stop();
      },
    );

    sidequestTest("breaks queue loop when availableSlots is MAX_SAFE_INTEGER", async ({ backend }) => {
      const queue1 = { name: "queue1", concurrency: 0 }; // interpreted as unlimited
      const queue2 = { name: "queue2", concurrency: 10 };

      const queueManager = new QueueManager(backend, [queue1, queue2]);
      const executorManager = new ExecutorManager(backend, 0, 2, 4); // global also unlimited

      const dispatcher = new Dispatcher(backend, queueManager, executorManager);

      const claimSpy = vi.spyOn(backend, "claimPendingJob").mockResolvedValue([]);
      const executeSpy = vi.spyOn(executorManager, "execute");

      // queue1 and global are unlimited → MAX_SAFE_INTEGER
      vi.spyOn(executorManager, "availableSlotsByQueue").mockImplementation((q) =>
        q.name === "queue1" ? Number.MAX_SAFE_INTEGER : 10,
      );
      vi.spyOn(executorManager, "availableSlotsGlobal").mockReturnValue(Number.MAX_SAFE_INTEGER);

      vi.spyOn(queueManager, "getActiveQueuesWithRunnableJobs").mockResolvedValue([
        queue1 as unknown as QueueConfig,
        queue2 as unknown as QueueConfig,
      ]);

      dispatcher.start();

      await vi.waitUntil(() => claimSpy.mock.calls.length > 0);

      expect(claimSpy).toHaveBeenCalledTimes(1);
      expect(claimSpy).toHaveBeenCalledWith("queue1", 20); // capped by safeAvailableSlots
      expect(claimSpy).not.toHaveBeenCalledWith("queue2", expect.anything());

      expect(executeSpy).not.toHaveBeenCalled();

      await dispatcher.stop();
    });

    sidequestTest("does not claim job when there is no available global slot", async ({ backend }) => {
      config.maxConcurrentJobs = 1;
      await createJob(backend, "other");

      expect(await backend.listJobs({ state: "waiting" })).toHaveLength(2);

      const dispatcher = new Dispatcher(
        backend,
        new QueueManager(backend, config.queues!),
        new ExecutorManager(backend, config.maxConcurrentJobs, 2, 4),
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

    sidequestTest("does not claim more jobs than queue concurrency allows", async ({ backend }) => {
      const claimSpy = vi.spyOn(backend, "claimPendingJob").mockResolvedValue([]);

      const dispatcher = new Dispatcher(
        backend,
        new QueueManager(backend, [{ name: "default", concurrency: 10 }]),
        new ExecutorManager(backend, 20, 2, 4),
      );

      dispatcher.start();

      await vi.waitUntil(() => {
        return claimSpy.mock.calls.length > 0;
      });

      expect(claimSpy).toHaveBeenCalledWith("default", 10);

      await dispatcher.stop();
    });

    sidequestTest("does not claim more jobs than global concurrency allows", async ({ backend }) => {
      const claimSpy = vi.spyOn(backend, "claimPendingJob").mockResolvedValue([]);

      const dispatcher = new Dispatcher(
        backend,
        new QueueManager(backend, [{ name: "default", concurrency: 10 }]),
        new ExecutorManager(backend, 1, 2, 4),
      );

      dispatcher.start();

      await vi.waitUntil(() => {
        return claimSpy.mock.calls.length > 0;
      });

      expect(claimSpy).toHaveBeenCalledWith("default", 1);

      await dispatcher.stop();
    });
  });
});
