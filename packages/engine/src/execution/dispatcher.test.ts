import { CompletedResult, JobData } from "@sidequest/core";
import { Engine, EngineConfig } from "../engine";
import { DummyJob } from "../test-jobs/dummy-job";
import { Dispatcher } from "./dispatcher";
import { ExecutorManager } from "./executor-manager";
import { QueueManager } from "./queue-manager";

const runMock = vi.fn();

vi.mock("../shared-runner", () => ({
  RunnerPool: vi.fn().mockImplementation(() => ({
    run: runMock,
  })),
}));

async function createJob(queue = "default") {
  const job = new DummyJob();
  await job.ready();
  await Engine.getBackend()!.createNewJob({
    queue: queue,
    state: "waiting",
    script: job.script!,
    class: job.className,
    args: [],
    constructor_args: [],
    attempt: 0,
    max_attempts: 1,
  });
}

describe("Dispatcher", () => {
  const dbLocation = ":memory:";
  const config: EngineConfig = {
    backend: { driver: "@sidequest/sqlite-backend", config: dbLocation },
    queues: [
      { name: "default", concurrency: 1 },
      { name: "noop", concurrency: 0 },
    ],
    maxConcurrentJobs: 5,
  };

  beforeEach(async () => {
    await Engine.configure(config);
    await createJob();

    vi.useFakeTimers();
  });

  afterEach(async () => {
    await Engine.close();
    vi.useRealTimers();
  });

  describe("start", () => {
    it("consumes waiting jobs", async () => {
      const backend = Engine.getBackend()!;

      expect(await backend.listJobs({ state: "waiting" })).toHaveLength(1);

      const dispatcher = new Dispatcher(
        backend,
        new QueueManager(backend, config.queues!),
        new ExecutorManager(backend, config.maxConcurrentJobs!, 2, 4),
      );
      dispatcher.start();

      runMock.mockImplementation(() => {
        return { type: "completed", result: "foo", __is_job_transition__: true } as CompletedResult;
      });

      await vi.waitUntil(async () => {
        const jobs = await backend.listJobs({ state: "waiting" });
        return jobs.length === 0;
      });

      await dispatcher.stop();
    });

    it("does not claim job when there is no available slot for the queue", async () => {
      const backend = Engine.getBackend()!;

      await createJob("noop");

      expect(await backend.listJobs({ state: "waiting" })).toHaveLength(2);

      const dispatcher = new Dispatcher(
        backend,
        new QueueManager(backend, config.queues!),
        new ExecutorManager(backend, config.maxConcurrentJobs!, 2, 4),
      );
      dispatcher.start();

      runMock.mockImplementation(() => {
        return { type: "completed", result: "foo", __is_job_transition__: true } as CompletedResult;
      });

      let jobs: JobData[];

      await vi.waitUntil(async () => {
        jobs = await backend.listJobs({ state: "waiting" });
        return jobs.length === 1;
      });

      expect(jobs!).toHaveLength(1);
      expect(jobs![0].queue).toEqual("noop");

      await dispatcher.stop();
    });

    it("does not claim job when there is no available global slot", async () => {
      config.maxConcurrentJobs = 1;
      const backend = Engine.getBackend()!;

      await createJob("other");

      expect(await backend.listJobs({ state: "waiting" })).toHaveLength(2);

      const dispatcher = new Dispatcher(
        backend,
        new QueueManager(backend, config.queues!),
        new ExecutorManager(backend, config.maxConcurrentJobs, 2, 4),
      );
      dispatcher.start();

      runMock.mockImplementation(() => {
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
