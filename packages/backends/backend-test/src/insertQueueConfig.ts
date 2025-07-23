import { describe, it } from "vitest";
import { backend } from "./backend";

export default function defineInsertQueueConfigTestSuite() {
  describe("insertQueueConfig / getQueueConfig", () => {
    it("should insert new queue with bare minimum", async () => {
      let insertedQueue = await backend.insertQueueConfig({
        name: "default",
      });
      expect(insertedQueue).toMatchObject({
        name: "default",
        concurrency: 10,
        priority: 0,
        state: "active",
      });

      insertedQueue = (await backend.getQueueConfig("default"))!;
      expect(insertedQueue).toMatchObject({
        name: "default",
        concurrency: 10,
        priority: 0,
        state: "active",
      });
    });

    it("should insert new queue with all optionals", async () => {
      let insertedQueue = await backend.insertQueueConfig({
        name: "default",
        concurrency: 100,
        priority: 100,
        state: "paused",
      });
      expect(insertedQueue).toMatchObject({
        name: "default",
        concurrency: 100,
        priority: 100,
        state: "paused",
      });

      insertedQueue = (await backend.getQueueConfig("default"))!;
      expect(insertedQueue).toMatchObject({
        name: "default",
        concurrency: 100,
        priority: 100,
        state: "paused",
      });
    });

    it("should not insert duplicated queue", async () => {
      await backend.insertQueueConfig({
        name: "default",
        concurrency: 100,
        priority: 100,
        state: "active",
      });
      await expect(
        backend.insertQueueConfig({
          name: "default",
          concurrency: 100,
          priority: 100,
          state: "active",
        }),
      ).rejects.toThrow();
    });
  });
}
