import { beforeEach, describe, expect, it } from "vitest";
import { Engine, SidequestConfig } from "../engine";
import { grantQueueConfig } from "../queue/grant-queue-config";
import { DummyJob } from "../test-jobs/dummy-job";
import { QueueManager } from "./queue-manager";

describe("QueueManager", () => {
  const dbLocation = ":memory:";
  const config: SidequestConfig = {
    backend: { driver: "@sidequest/sqlite-backend", config: dbLocation },
  };

  beforeEach(async () => {
    await Engine.configure(config);
  });

  afterEach(async () => {
    await Engine.close();
  });

  it("get query config from waiting job in a new queue", async () => {
    await Engine.build(DummyJob).queue("new").enqueue();

    const queues = await new QueueManager(
      { queues: [{ queue: "default" }] },
      Engine.getBackend()!,
    ).getQueuesWithRunnableJobs();
    expect(queues).toHaveLength(1);
    expect(queues[0].queue).toEqual("new");
  });

  it("get query config from waiting job in a new queue", async () => {
    await grantQueueConfig("default", { queue: "default", concurrency: 16 });
    await Engine.build(DummyJob).queue("default").enqueue();

    const queues = await new QueueManager(
      { queues: [{ queue: "default" }] },
      Engine.getBackend()!,
    ).getQueuesWithRunnableJobs();
    expect(queues).toHaveLength(1);
    expect(queues[0].queue).toEqual("default");
    expect(queues[0].concurrency).toEqual(16);
  });

  it("sorts queues by priority", async () => {
    await grantQueueConfig("default", { queue: "default", priority: 0 });
    await grantQueueConfig("high", { queue: "high", priority: 10 });

    await Engine.build(DummyJob).queue("default").enqueue();
    await Engine.build(DummyJob).queue("high").enqueue();

    const queues = await new QueueManager(
      { queues: [{ queue: "default" }] },
      Engine.getBackend()!,
    ).getQueuesWithRunnableJobs();
    expect(queues).toHaveLength(2);
    expect(queues[0].queue).toEqual("high");
    expect(queues[0].priority).toEqual(10);
  });
});
