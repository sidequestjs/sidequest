import { sidequestTest, SidequestTestFixture } from "@/tests/fixture";
import { AbortReasonMessage, JobData, JobTimeout } from "@sidequest/core";
import { MessagePort } from "node:worker_threads";
import { beforeEach, describe, expect, vi } from "vitest";
import { DummyJob } from "../test-jobs/dummy-job";
import { RunnerPool } from "./runner-pool";

const piscinaMockInstance = {
  run: vi.fn().mockResolvedValue({ type: "completed", result: "ok" }),
  destroy: vi.fn().mockResolvedValue(undefined),
};

vi.mock("piscina", () => {
  return {
    default: vi.fn().mockImplementation(function () {
      return piscinaMockInstance;
    }),
  };
});

describe("RunnerPool", () => {
  let pool: RunnerPool;
  let jobData: JobData;

  beforeEach<SidequestTestFixture>(async ({ backend, config }) => {
    const job = new DummyJob();
    await job.ready();

    jobData = await backend.createNewJob({
      class: job.className,
      script: job.script,
      args: [],
      attempt: 0,
      queue: "default",
      constructor_args: [],
      state: "waiting",
    });

    pool = new RunnerPool(config);
  });

  sidequestTest("passes the abort signal straight to piscina when grace is 0", async ({ config }) => {
    const signal = new AbortController().signal;
    const result = await pool.run(jobData, signal);

    expect(result).toEqual({ type: "completed", result: "ok" });
    expect(piscinaMockInstance.run).toHaveBeenCalledWith({ jobData, config }, { signal });
  });

  sidequestTest(
    "with a grace period, delivers the abort over a port and hard-kills after the grace",
    async ({ config }) => {
      vi.useFakeTimers();
      try {
        const gracePool = new RunnerPool({ ...config, abortGracePeriodMs: 1000 });

        let capturedPort: MessagePort | undefined;
        let hardKillSignal: AbortSignal | undefined;
        piscinaMockInstance.run.mockImplementationOnce(
          (value: { abortPort: MessagePort }, opts: { signal: AbortSignal }) => {
            capturedPort = value.abortPort;
            hardKillSignal = opts.signal;
            // Resolve only once piscina is asked to terminate (hard kill).
            return new Promise((resolve) =>
              opts.signal.addEventListener("abort", () => resolve({ type: "completed", result: "killed" })),
            );
          },
        );

        const controller = new AbortController();
        const runPromise = gracePool.run(jobData, controller.signal);

        const message = new Promise<AbortReasonMessage>((resolve) =>
          capturedPort!.once("message", (m: AbortReasonMessage) => resolve(m)),
        );

        controller.abort(new JobTimeout(5000));

        expect(await message).toEqual({ kind: "timeout", timeoutMs: 5000 });
        expect(hardKillSignal!.aborted).toBe(false);

        // Grace elapses -> piscina is asked to terminate the worker.
        await vi.advanceTimersByTimeAsync(1000);
        expect(hardKillSignal!.aborted).toBe(true);

        await runPromise;
      } finally {
        vi.useRealTimers();
      }
    },
  );

  sidequestTest("should call pool.destroy", () => {
    pool.destroy();
    expect(piscinaMockInstance.destroy).toHaveBeenCalled();
  });
});
