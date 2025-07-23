import { QueueConfig } from "@sidequest/core";
import { randomUUID } from "node:crypto";
import { unlink } from "node:fs";
import { describe, it, vi } from "vitest";
import { Engine, SidequestConfig } from "../engine";
import { JobActions } from "../job/job-actions";
import { JobBuilder } from "../job/job-builder";
import { DummyJob } from "../test-jobs/dummy-job";
import { Worker } from "./main";

const fakeChild = vi.hoisted(() => ({
  on: vi.fn(),
  send: vi.fn(),
  kill: vi.fn(),
}));

const mocks = vi.hoisted(() => ({
  fork: vi.fn(() => fakeChild),
}));

vi.mock("child_process", () => ({
  fork: mocks.fork,
}));

describe("main.ts", () => {
  const highQueueName = `high-${randomUUID()}`;
  const mediumQueueName = `medium-${randomUUID()}`;
  const lowQueueName = `low-${randomUUID()}`;
  const singleQueueName = `single-${randomUUID()}`;

  const queues: Record<string, QueueConfig> = {
    [highQueueName]: { queue: highQueueName, priority: 10 },
    [mediumQueueName]: { queue: mediumQueueName, priority: 5 },
    [lowQueueName]: { queue: lowQueueName },
    [singleQueueName]: { queue: singleQueueName, concurrency: 1 },
  };

  const dbLocation = "./sidequest-test.sqlite";
  const config: SidequestConfig = { queues, backend: { driver: "@sidequest/sqlite-backend", config: dbLocation } };

  beforeAll(async () => {
    await Engine.configure(config);
  });

  afterAll(async () => {
    await Engine.getBackend().close();
    unlink(dbLocation, () => {
      // noop
    });
  });

  it("runs the worker", async () => {
    const worker = new Worker();
    await worker.run(config);
    const jobData = await new JobBuilder(DummyJob).enqueue();

    mocks.fork.mockImplementation(() => {
      void JobActions.setComplete(jobData, "result");
      return fakeChild;
    });

    if (jobData.id) {
      await vi.waitUntil(async () => {
        const job = await Engine.getBackend().getJob(jobData.id!);
        return job.state === "completed";
      });
    }

    worker.stop();
  });
});
