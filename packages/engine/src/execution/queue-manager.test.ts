import { sidequestTest } from "@/tests/fixture";
import { describe, expect } from "vitest";
import { grantQueueConfig } from "../queue/grant-queue-config";
import { DummyJob } from "../test-jobs/dummy-job";
import { QueueManager } from "./queue-manager";

describe("QueueManager", () => {
  sidequestTest("get query config from waiting job in a new queue", async ({ engine, backend }) => {
    await engine.build(DummyJob).queue("new").enqueue();

    const queues = await new QueueManager(backend, [{ name: "default" }]).getActiveQueuesWithRunnableJobs();
    expect(queues).toHaveLength(1);
    expect(queues[0].name).toEqual("new");
  });

  sidequestTest("get query config from waiting job in a new queue", async ({ engine, backend }) => {
    await grantQueueConfig(backend, { name: "default", concurrency: 16 });
    await engine.build(DummyJob).queue("default").enqueue();

    const queues = await new QueueManager(backend, [{ name: "default" }]).getActiveQueuesWithRunnableJobs();
    expect(queues).toHaveLength(1);
    expect(queues[0].name).toEqual("default");
    expect(queues[0].concurrency).toEqual(16);
  });

  sidequestTest("sorts queues by priority", async ({ engine, backend }) => {
    await grantQueueConfig(backend, { name: "default", priority: 0 });
    await grantQueueConfig(backend, { name: "high", priority: 10 });

    await engine.build(DummyJob).queue("default").enqueue();
    await engine.build(DummyJob).queue("high").enqueue();

    const queues = await new QueueManager(backend, [{ name: "default" }]).getActiveQueuesWithRunnableJobs();
    expect(queues).toHaveLength(2);
    expect(queues[0].name).toEqual("high");
    expect(queues[0].priority).toEqual(10);
  });

  sidequestTest("should only get active queues", async ({ engine, backend }) => {
    await grantQueueConfig(backend, { name: "default", priority: 100, state: "paused" });
    await grantQueueConfig(backend, { name: "high", priority: 10 });

    await engine.build(DummyJob).queue("default").enqueue();
    await engine.build(DummyJob).queue("high").enqueue();

    const queues = await new QueueManager(backend, [{ name: "default" }]).getActiveQueuesWithRunnableJobs();
    expect(queues).toHaveLength(1);
    expect(queues[0].name).toEqual("high");
    expect(queues[0].priority).toEqual(10);
  });
});
