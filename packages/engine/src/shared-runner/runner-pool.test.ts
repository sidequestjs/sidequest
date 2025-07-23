import { sidequestTest, SidequestTestFixture } from "@/tests/fixture";
import { JobData } from "@sidequest/core";
import EventEmitter from "events";
import { beforeEach, describe, expect, vi } from "vitest";
import { DummyJob } from "../test-jobs/dummy-job";
import { RunnerPool } from "./runner-pool";

const piscinaMockInstance = {
  run: vi.fn().mockResolvedValue({ type: "completed", result: "ok" }),
  destroy: vi.fn().mockResolvedValue(undefined),
};

vi.mock("piscina", () => {
  return {
    default: vi.fn().mockImplementation(() => piscinaMockInstance),
  };
});

describe("RunnerPool", () => {
  let pool: RunnerPool;
  let jobData: JobData;

  beforeEach<SidequestTestFixture>(async ({ backend }) => {
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

    pool = new RunnerPool(2, 4);
  });

  sidequestTest("should call pool.run with job data", async () => {
    const emiter = new EventEmitter();
    const result = await pool.run(jobData, emiter);

    expect(result).toEqual({ type: "completed", result: "ok" });
    expect(piscinaMockInstance.run).toHaveBeenCalledWith(jobData, { signal: emiter });
  });

  sidequestTest("should call pool.destroy", async () => {
    await pool.destroy();
    expect(piscinaMockInstance.destroy).toHaveBeenCalled();
  });
});
