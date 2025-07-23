import { describe, it } from "vitest";
import { backend } from "./backend";

export default function defineTruncateTestSuite() {
  describe("truncate", () => {
    it("should truncate all tables", async () => {
      const insertedJob = await backend.createNewJob({
        queue: "default",
        class: "TestJob",
        args: [],
        constructor_args: [],
        state: "waiting",
        script: "test.js",
        attempt: 0,
      });
      const insertedQueue = await backend.createNewQueue({
        name: "default",
        concurrency: 100,
        priority: 10,
        state: "active",
      });

      await backend.truncate();

      expect(await backend.getJob(insertedJob.id)).toBeFalsy();
      expect(await backend.getQueue(insertedQueue.name)).toBeFalsy();
    });
  });
}
