import { Backend } from "@sidequest/backend";
import { beforeEach, describe, expect, it } from "vitest";
import { Engine, EngineConfig } from "../engine";
import { grantQueueConfig } from "../queue/grant-queue-config";
import { DummyJob } from "../test-jobs/dummy-job";
import { QueueManager } from "./queue-manager";

describe("QueueManager", () => {
  const dbLocation = ":memory:";
  const config: EngineConfig = {
    backend: { driver: "@sidequest/sqlite-backend", config: dbLocation },
  };

  let backend: Backend;

  beforeEach(async () => {
    await Engine.configure(config);
    backend = Engine.getBackend()!;
  });

  afterEach(async () => {
    await Engine.close();
  });

  it("get query config from waiting job in a new queue", async () => {
    await Engine.build(DummyJob).queue("new").enqueue();

    const queues = await new QueueManager(Engine.getBackend()!, [
      { name: "default" },
    ]).getActiveQueuesWithRunnableJobs();
    expect(queues).toHaveLength(1);
    expect(queues[0].name).toEqual("new");
  });

  it("get query config from waiting job in a new queue", async () => {
    await grantQueueConfig(backend, { name: "default", concurrency: 16 });
    await Engine.build(DummyJob).queue("default").enqueue();

    const queues = await new QueueManager(Engine.getBackend()!, [
      { name: "default" },
    ]).getActiveQueuesWithRunnableJobs();
    expect(queues).toHaveLength(1);
    expect(queues[0].name).toEqual("default");
    expect(queues[0].concurrency).toEqual(16);
  });

  it("sorts queues by priority", async () => {
    await grantQueueConfig(backend, { name: "default", priority: 0 });
    await grantQueueConfig(backend, { name: "high", priority: 10 });

    await Engine.build(DummyJob).queue("default").enqueue();
    await Engine.build(DummyJob).queue("high").enqueue();

    const queues = await new QueueManager(Engine.getBackend()!, [
      { name: "default" },
    ]).getActiveQueuesWithRunnableJobs();
    expect(queues).toHaveLength(2);
    expect(queues[0].name).toEqual("high");
    expect(queues[0].priority).toEqual(10);
  });

  it("should only get active queues", async () => {
    await grantQueueConfig(backend, { name: "default", priority: 100, state: "paused" });
    await grantQueueConfig(backend, { name: "high", priority: 10 });

    await Engine.build(DummyJob).queue("default").enqueue();
    await Engine.build(DummyJob).queue("high").enqueue();

    const queues = await new QueueManager(Engine.getBackend()!, [
      { name: "default" },
    ]).getActiveQueuesWithRunnableJobs();
    expect(queues).toHaveLength(1);
    expect(queues[0].name).toEqual("high");
    expect(queues[0].priority).toEqual(10);
  });
});
