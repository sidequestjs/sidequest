import { sidequestTest, SidequestTestFixture } from "@/tests/fixture";
import { JobData } from "@sidequest/core";
import { beforeEach, describe, expect, vi } from "vitest";
import { DummyJob } from "../test-jobs/dummy-job";
import { InlineRunner } from "./inline-runner";

// Spy on the runner module's default export so we can assert how the InlineRunner delegates to it.
vi.mock("./runner", async (importOriginal) => {
  const original = await importOriginal<typeof import("./runner")>();
  return { default: vi.fn(original.default), injectSidequestConfig: original.injectSidequestConfig };
});

import run from "./runner";

describe("InlineRunner", () => {
  let runner: InlineRunner;
  let jobData: JobData;

  beforeEach<SidequestTestFixture>(async ({ backend, config }) => {
    vi.clearAllMocks();

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

    runner = new InlineRunner(config);
  });

  sidequestTest("runs the job in-process and returns its result", async () => {
    const result = await runner.run(jobData);
    expect(result).toEqual({ __is_job_transition__: true, type: "completed", result: "dummy job" });
  });

  sidequestTest("delegates to the runner with inline enabled and forwards the signal", async ({ config }) => {
    const signal = new AbortController().signal;
    await runner.run(jobData, signal);
    expect(run).toHaveBeenCalledWith({ jobData, config, inline: true, signal });
  });

  sidequestTest("destroy is a no-op and does not throw", () => {
    expect(() => runner.destroy()).not.toThrow();
  });
});
