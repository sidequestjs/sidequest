import { Backend } from "@sidequest/backend";
import { beforeEach, describe, expect, it } from "vitest";
import { Engine, SidequestConfig } from "../engine";
import { grantQueueConfig, QueueDefaults } from "../queue/grant-queue-config";
import { DummyJob } from "../test-jobs/dummy-job";
import { QueueManager } from "./queue-manager";

describe("QueueManager", () => {
  const dbLocation = ":memory:";
  const config: SidequestConfig = {
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

  it("applies queue defaults when creating new queue configs", async () => {
    const queueDefaults: QueueDefaults = {
      concurrency: 5,
      priority: 3,
      state: "active",
    };

    await Engine.build(DummyJob).queue("test-defaults").enqueue();

    const queues = await new QueueManager(
      Engine.getBackend()!,
      [{ name: "test-defaults" }],
      queueDefaults,
    ).getActiveQueuesWithRunnableJobs();

    expect(queues).toHaveLength(1);
    expect(queues[0].name).toEqual("test-defaults");
    expect(queues[0].concurrency).toEqual(5); // from defaults
    expect(queues[0].priority).toEqual(3); // from defaults
    expect(queues[0].state).toEqual("active"); // from defaults
  });

  it("queue manager defaults override built-in defaults but are overridden by queue-specific config", async () => {
    const queueDefaults: QueueDefaults = {
      concurrency: 8,
      priority: 2,
      state: "active",
    };

    // Create a queue with specific config that should override defaults
    await grantQueueConfig(backend, { name: "specific-config", concurrency: 12, priority: 5 });
    await Engine.build(DummyJob).queue("specific-config").enqueue();

    // Create a new queue that should use defaults
    await Engine.build(DummyJob).queue("use-defaults").enqueue();

    const queues = await new QueueManager(
      Engine.getBackend()!,
      [
        { name: "specific-config", concurrency: 12, priority: 5 }, // explicit config
        { name: "use-defaults" }, // should use defaults
      ],
      queueDefaults,
    ).getActiveQueuesWithRunnableJobs();

    expect(queues).toHaveLength(2);

    // Find each queue in the results
    const specificQueue = queues.find((q) => q.name === "specific-config");
    const defaultsQueue = queues.find((q) => q.name === "use-defaults");

    // Specific config should override defaults
    expect(specificQueue?.concurrency).toEqual(12);
    expect(specificQueue?.priority).toEqual(5);

    // New queue should use defaults
    expect(defaultsQueue?.concurrency).toEqual(8); // from defaults
    expect(defaultsQueue?.priority).toEqual(2); // from defaults
    expect(defaultsQueue?.state).toEqual("active"); // from defaults
  });
});
