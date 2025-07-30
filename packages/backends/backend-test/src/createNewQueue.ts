import { describe, it } from "vitest";
import { backend } from "./backend";

export default function defineInsertQueueConfigTestSuite() {
  describe("createNewQueue / getQueue", () => {
    it("should insert new queue with bare minimum", async () => {
      let insertedQueue = await backend.createNewQueue({
        name: "default",
      });
      expect(insertedQueue).toMatchObject({
        name: "default",
        concurrency: 10,
        priority: 0,
        state: "active",
      });

      insertedQueue = (await backend.getQueue("default"))!;
      expect(insertedQueue).toMatchObject({
        name: "default",
        concurrency: 10,
        priority: 0,
        state: "active",
      });
    });

    it("should insert new queue with all optionals", async () => {
      let insertedQueue = await backend.createNewQueue({
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

      insertedQueue = (await backend.getQueue("default"))!;
      expect(insertedQueue).toMatchObject({
        name: "default",
        concurrency: 100,
        priority: 100,
        state: "paused",
      });
    });

    it("should not insert duplicated queue", async () => {
      await backend.createNewQueue({
        name: "default",
        concurrency: 100,
        priority: 100,
        state: "active",
      });
      await expect(
        backend.createNewQueue({
          name: "default",
          concurrency: 100,
          priority: 100,
          state: "active",
        }),
      ).rejects.toThrow();
    });

    it("should throw if concurrency is less than 1", async () => {
      await expect(
        backend.createNewQueue({
          name: "invalid-concurrency",
          concurrency: 0,
          priority: 1,
          state: "active",
        }),
      ).rejects.toThrow("Concurrency must be at least 1");
    });
  });
}
