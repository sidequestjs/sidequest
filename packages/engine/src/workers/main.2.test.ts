import { NewQueueData } from "@sidequest/backend";
import { JobData } from "@sidequest/core";
import * as childProcess from "child_process";
import { ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import { unlink } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { Engine, SidequestConfig } from "../engine";
import { JobBuilder } from "../job/job-builder";
import { DummyJob } from "../test-jobs/dummy-job";
import { DynamicDummyJob } from "../test-jobs/dynamic-dummy-job";
import { Worker } from "./main";

vi.mock("child_process", () => ({
  fork: vi.fn(),
}));

function mockChildProcess(fns?: { on?: ChildProcess["on"]; send?: ChildProcess["send"]; kill?: ChildProcess["kill"] }) {
  // @ts-expect-error we should return a ChildProcess, but we only use those 3 methods
  vi.spyOn(childProcess, "fork").mockImplementation(() => ({
    on:
      fns?.on ??
      vi.fn((event: string, handler: (...args: unknown[]) => unknown) => {
        if (event === "message") {
          handler("ready");
        }
        return {} as ChildProcess;
      }),
    send: fns?.send ?? vi.fn(),
    kill: fns?.kill ?? vi.fn(),
  }));
}

describe("main.ts", () => {
  const highQueueName = `high-${randomUUID()}`;
  const mediumQueueName = `medium-${randomUUID()}`;
  const lowQueueName = `low-${randomUUID()}`;
  const singleQueueName = `single-${randomUUID()}`;

  const queues: Record<string, NewQueueData> = {
    [highQueueName]: { name: highQueueName, priority: 10 },
    [mediumQueueName]: { name: mediumQueueName, priority: 5 },
    [lowQueueName]: { name: lowQueueName },
    [singleQueueName]: { name: singleQueueName, concurrency: 1 },
  };

  const dbLocation = "./sidequest-test.sqlite";
  const config: SidequestConfig = {
    queues,
    backend: { driver: "@sidequest/sqlite-backend", config: dbLocation },
  };

  beforeEach(async () => {
    await Engine.configure(config);
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await Engine.close();
    unlink(dbLocation, () => {
      // noop
    });
  });

  it("should process queues based on priority order", async () => {
    const executed: JobData[] = [];

    mockChildProcess({
      send: vi.fn((msg: { job: JobData }) => {
        executed.push(msg.job);
        return true;
      }),
    });

    const worker = new Worker();
    await worker.run(config);

    await new JobBuilder(DynamicDummyJob).queue(lowQueueName).enqueue();
    await new JobBuilder(DynamicDummyJob).queue(mediumQueueName).enqueue();
    await new JobBuilder(DynamicDummyJob).queue(highQueueName).enqueue();

    // Wait a bit to allow processing
    await vi.waitUntil(() => executed.length >= 3);

    worker.stop();

    expect(executed.map((j) => j.queue)).toEqual([highQueueName, mediumQueueName, lowQueueName]);
  });

  it("should timeout", async () => {
    const kilFn = vi.fn();
    const sendFn = vi.fn(() => {
      // We never call the exit handler here to simulate a timeout
      return true;
    });
    mockChildProcess({
      send: sendFn,
      kill: kilFn,
    });

    const worker = new Worker();
    await worker.run(config);

    await new JobBuilder(DummyJob).timeout(50).queue(lowQueueName).enqueue();

    await vi.waitUntil(async () => {
      const [job] = await Engine.getBackend()!.listJobs({ jobClass: DummyJob.name, state: "waiting" });
      return job?.errors?.[0].message?.includes("timed out");
    });

    worker.stop();

    expect(childProcess.fork).toHaveBeenCalled();
    expect(sendFn).toHaveBeenCalledWith({ type: "shutdown" });
  });

  it("should exit with code !== 0", async () => {
    let onExit: (code: number) => unknown;
    mockChildProcess({
      on: vi.fn((event: string, handler: (...args: unknown[]) => unknown) => {
        if (event === "message") {
          handler("ready");
        } else if (event === "exit") {
          onExit = handler;
        }
        return {} as ChildProcess;
      }),
      send: vi.fn(() => {
        onExit(1);
        return true;
      }),
    });

    const worker = new Worker();
    await worker.run(config);

    await new JobBuilder(DummyJob).timeout(0).queue(lowQueueName).enqueue();

    await vi.waitUntil(async () => {
      const [job] = await Engine.getBackend()!.listJobs({ jobClass: DummyJob.name, state: "waiting" });
      return job?.errors?.[0].message?.includes("exited with code");
    });

    worker.stop();

    expect(childProcess.fork).toHaveBeenCalled();
  });
});
