import { NewQueueData } from "@sidequest/backend";
import { QueueConfig } from "@sidequest/core";
import { describe, expect, it } from "vitest";
import { backend } from "./backend";

export default function defineUpdateQueueTestSuite() {
  describe("updateQueue", () => {
    it("should update nothing on queue", async () => {
      // Insert a queue
      const queue: NewQueueData = {
        name: "default",
        concurrency: 5,
        priority: 1,
        state: "active",
      };
      const insertedQueue = await backend.insertQueueConfig(queue);
      const updatedQueue = await backend.updateQueue({ id: insertedQueue.id });
      expect(updatedQueue).toMatchObject(insertedQueue);
    });

    it("should update values", async () => {
      // Insert a queue
      const queue: NewQueueData = {
        name: "default3",
        concurrency: 3,
        priority: 3,
        state: "active",
      };
      const insertedQueue = await backend.insertQueueConfig(queue);
      const newData: QueueConfig = {
        id: insertedQueue.id,
        name: "updatedQueue",
        concurrency: 7,
        priority: 5,
        state: "paused",
      };

      const updatedQueue = await backend.updateQueue(newData);
      expect(updatedQueue).toMatchObject(newData);
    });

    it("should error on queue not found", async () => {
      await expect(backend.updateQueue({ id: -1 })).rejects.toThrow();
    });
  });
}
