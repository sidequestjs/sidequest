import { JobData } from "@sidequest/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
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

import { Engine, SidequestConfig } from "../engine";
import { DummyJob } from "../test-jobs/dummy-job";

describe("RunnerPool", () => {
  let pool: RunnerPool;
  let jobData: JobData;

  const dbLocation = ":memory:";
  const config: SidequestConfig = {
    backend: { driver: "@sidequest/sqlite-backend", config: dbLocation },
  };

  beforeEach(async () => {
    await Engine.configure(config);
    const backend = Engine.getBackend();
    const job = new DummyJob();
    await job.ready();

    jobData = await backend!.createNewJob({
      class: job.className,
      script: job.script!,
      args: [],
      attempt: 0,
      queue: "default",
      constructor_args: [],
      state: "waiting",
    });

    pool = new RunnerPool(2);
  });

  it("should call pool.run with job data", async () => {
    const result = await pool.run(jobData);

    expect(result).toEqual({ type: "completed", result: "ok" });
    expect(piscinaMockInstance.run).toHaveBeenCalledWith(jobData);
  });

  it("should call pool.destroy", async () => {
    await pool.destroy();
    expect(piscinaMockInstance.destroy).toHaveBeenCalled();
  });
});
