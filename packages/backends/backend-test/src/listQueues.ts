import { describe, it } from "vitest";
import { backend } from ".";

export default function defineListQueuesTestSuite() {
  describe("listQueues", () => {
    it("should list no queue", async () => {
      const queues = await backend.listQueues();
      expect(queues).toHaveLength(0);
    });

    it("should list multiple queues in priority order", async () => {
      await backend.insertQueueConfig({
        name: "default",
        concurrency: 100,
        priority: 10,
        state: "active",
      });

      await backend.insertQueueConfig({
        name: "default2",
        concurrency: 100,
        priority: 100,
        state: "active",
      });

      const queues = await backend.listQueues();
      expect(queues).toHaveLength(2);
      expect(queues[0].name).toBe("default2");
      expect(queues[1].name).toBe("default");
    });
  });
}
