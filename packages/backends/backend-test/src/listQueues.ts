import { describe, it } from "vitest";
import { backend } from "./backend";

export default function defineListQueuesTestSuite() {
  describe("listQueues", () => {
    it("should list no queue", async () => {
      const queues = await backend.listQueues();
      expect(queues).toHaveLength(0);
    });

    it("should list multiple queues in priority order", async () => {
      await backend.createNewQueue({
        name: "default",
        concurrency: 100,
        priority: 10,
        state: "active",
      });

      await backend.createNewQueue({
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

    it("should list queues in ascending priority order", async () => {
      await backend.createNewQueue({
        name: "asc1",
        concurrency: 10,
        priority: 1,
        state: "active",
      });
      await backend.createNewQueue({
        name: "asc2",
        concurrency: 10,
        priority: 2,
        state: "active",
      });
      const queues = await backend.listQueues({ column: "priority", order: "asc" });
      expect(queues[0].priority).toBeLessThanOrEqual(queues[1].priority);
    });

    it("should list queues in descending concurrency order", async () => {
      await backend.createNewQueue({
        name: "con1",
        concurrency: 5,
        priority: 1,
        state: "active",
      });
      await backend.createNewQueue({
        name: "con2",
        concurrency: 20,
        priority: 2,
        state: "active",
      });
      const queues = await backend.listQueues({ column: "concurrency", order: "desc" });
      expect(queues[0].concurrency).toBeGreaterThanOrEqual(queues[1].concurrency);
    });

    it("should list queues in ascending name order", async () => {
      await backend.createNewQueue({
        name: "bqueue",
        concurrency: 1,
        priority: 1,
        state: "active",
      });
      await backend.createNewQueue({
        name: "aqueue",
        concurrency: 1,
        priority: 2,
        state: "active",
      });
      const queues = await backend.listQueues({ column: "name", order: "asc" });
      expect(queues[0].name < queues[1].name).toBe(true);
    });
  });
}
