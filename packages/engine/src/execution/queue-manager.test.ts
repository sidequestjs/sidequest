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

  sidequestTest("should not override queue state when it has been changed", async ({ engine, backend }) => {
    // Enqueue a job to this queue
    await engine.build(DummyJob).queue("test-queue").enqueue();

    // Create a new QueueManager instance
    const queueManager = new QueueManager(backend, [{ name: "test-queue", state: "active" }]);
    // Get active queues with runnable jobs
    // This will create the queue if it doesn't exist
    let queues = await queueManager.getActiveQueuesWithRunnableJobs();
    expect(queues).toHaveLength(1);

    let queue = await backend.getQueue("test-queue");
    // Manually change the queue state to paused
    await backend.updateQueue({ id: queue!.id, state: "paused" });

    // Verify the state was changed
    queue = await backend.getQueue("test-queue");
    expect(queue?.state).toBe("paused");

    // Call it again to see if it overrides the state
    queues = await queueManager.getActiveQueuesWithRunnableJobs();
    expect(queues).toHaveLength(0);

    // Verify that the state remains paused and was not overridden
    queue = await backend.getQueue("test-queue");
    expect(queue?.state).toBe("paused");

    // Verify that the paused queue is not included in active queues with runnable jobs
    queues = await queueManager.getActiveQueuesWithRunnableJobs();
    expect(queues).toHaveLength(0);
  });
});
