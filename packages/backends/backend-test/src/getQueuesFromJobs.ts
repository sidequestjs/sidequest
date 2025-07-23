import { describe, it } from "vitest";
import { backend } from ".";

export default function defineGetQueuesFromJobsTestSuite() {
  describe("getQueuesFromJobs", () => {
    it("should find no queues from jobs when no jobs", async () => {
      const queues = await backend.getQueuesFromJobs();
      expect(queues).toHaveLength(0);
    });

    it("should find all queues of all jobs", async () => {
      await backend.createNewJob({
        queue: "default",
        class: "TestJob",
        args: [],
        constructor_args: [],
        state: "waiting",
        script: "test.js",
        attempt: 0,
      });

      const secondJob = await backend.createNewJob({
        queue: "default2",
        class: "TestJob",
        args: [],
        constructor_args: [],
        state: "waiting",
        script: "test.js",
        attempt: 0,
      });
      await backend.updateJob({ id: secondJob.id, state: "failed" });

      const queues = await backend.getQueuesFromJobs();
      expect(queues).toHaveLength(2);
      expect(queues[0]).toBe("default");
      expect(queues[1]).toBe("default2");

      // A job can exist without an existing queue
      const queueNames = await backend.listQueues();
      expect(queueNames).toHaveLength(0);
    });
  });
}
