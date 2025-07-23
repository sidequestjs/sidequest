import { JobData, QueueConfig } from "@sidequest/core";
import { randomUUID } from "node:crypto";
import { unlink } from "node:fs";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { Engine, SidequestConfig } from "../engine";
import { DynamicDummyJob } from "../test-jobs/dynamic-dummy-job";
import { Worker } from "./main";

const executed: JobData[] = [];

// Use hoisted mock but don't close over `executed`
vi.mock("child_process", () => {
  const mod = {
    fork: vi.fn(() => {
      let onExit: () => unknown;

      return {
        on: vi.fn((event: string, handler: (...args: unknown[]) => unknown) => {
          if (event === "message") {
            handler("ready");
          } else if (event === "exit") {
            onExit = handler;
          }
        }),

        send: vi.fn((msg: { job: JobData }) => {
          executed.push(msg.job); // now references the correct array
          onExit?.(); // simulate process exit
        }),

        kill: vi.fn(),
      };
    }),
  };

  return mod;
});

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
  const config: SidequestConfig = {
    queues,
    backend: { driver: "@sidequest/sqlite-backend", config: dbLocation },
  };

  beforeAll(async () => {
    await Engine.configure(config);
  });

  afterAll(async () => {
    await Engine.getBackend().close();
    unlink(dbLocation, () => {
      // noop
    });
  });

  it("should process queues based on priority order", async () => {
    const worker = new Worker();
    await worker.run(config);

    await DynamicDummyJob.config({ queue: lowQueueName }).enqueue();
    await DynamicDummyJob.config({ queue: mediumQueueName }).enqueue();
    await DynamicDummyJob.config({ queue: highQueueName }).enqueue();

    // Wait a bit to allow processing
    await new Promise((resolve) => setTimeout(resolve, 200));

    worker.stop();

    expect(executed.map((j) => j.queue)).toEqual([highQueueName, mediumQueueName, lowQueueName]);
  });
});
