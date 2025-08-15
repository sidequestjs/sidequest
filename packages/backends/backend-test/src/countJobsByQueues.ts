import { UpdateJobData } from "@sidequest/backend";
import { JobState } from "@sidequest/core";
import { describe, expect, it } from "vitest";
import { backend } from "./backend";

export default function defineCountJobsByQueuesTestSuite() {
  describe("countJobsByQueues", () => {
    it("should return empty object when no jobs exist", async () => {
      const queueCounts = await backend.countJobsByQueues();
      expect(queueCounts).toEqual({});
    });

    it("should return counts for single queue with single job", async () => {
      await backend.createNewJob({
        queue: "test-queue",
        script: "test-script",
        class: "TestJob",
        args: [],
        constructor_args: [],
        state: "waiting",
        attempt: 0,
      });

      const queueCounts = await backend.countJobsByQueues();

      expect(queueCounts).toHaveProperty("test-queue");
      expect(queueCounts["test-queue"]).toEqual({
        total: 1,
        waiting: 1,
        claimed: 0,
        running: 0,
        completed: 0,
        failed: 0,
        canceled: 0,
      });
    });

    it("should count jobs correctly by state for single queue", async () => {
      // Create jobs in different states for the same queue
      await backend.createNewJob({
        queue: "single-queue",
        script: "test-script",
        class: "TestJob",
        args: [],
        constructor_args: [],
        state: "waiting",
        attempt: 0,
      });

      const job2 = await backend.createNewJob({
        queue: "single-queue",
        script: "test-script",
        class: "TestJob",
        args: [],
        constructor_args: [],
        state: "waiting",
        attempt: 0,
      });

      // Update one job to completed state
      await backend.updateJob({
        id: job2.id,
        state: "completed",
        completed_at: new Date(),
      });

      const job3 = await backend.createNewJob({
        queue: "single-queue",
        script: "test-script",
        class: "TestJob",
        args: [],
        constructor_args: [],
        state: "waiting",
        attempt: 0,
      });

      // Update another job to failed state
      await backend.updateJob({
        id: job3.id,
        state: "failed",
        failed_at: new Date(),
      });

      const queueCounts = await backend.countJobsByQueues();

      expect(queueCounts).toHaveProperty("single-queue");
      expect(queueCounts["single-queue"].total).toBe(3);
      expect(queueCounts["single-queue"].waiting).toBe(1);
      expect(queueCounts["single-queue"].completed).toBe(1);
      expect(queueCounts["single-queue"].failed).toBe(1);
      expect(queueCounts["single-queue"].claimed).toBe(0);
      expect(queueCounts["single-queue"].running).toBe(0);
      expect(queueCounts["single-queue"].canceled).toBe(0);
    });

    it("should count jobs correctly across multiple queues", async () => {
      // Create jobs in different queues
      await backend.createNewJob({
        queue: "queue-1",
        script: "test-script",
        class: "TestJob",
        args: [],
        constructor_args: [],
        state: "waiting",
        attempt: 0,
      });

      await backend.createNewJob({
        queue: "queue-1",
        script: "test-script",
        class: "TestJob",
        args: [],
        constructor_args: [],
        state: "waiting",
        attempt: 0,
      });

      const job3 = await backend.createNewJob({
        queue: "queue-2",
        script: "test-script",
        class: "TestJob",
        args: [],
        constructor_args: [],
        state: "waiting",
        attempt: 0,
      });

      // Update job in queue-2 to completed state
      await backend.updateJob({
        id: job3.id,
        state: "completed",
        completed_at: new Date(),
      });

      const job4 = await backend.createNewJob({
        queue: "queue-3",
        script: "test-script",
        class: "TestJob",
        args: [],
        constructor_args: [],
        state: "waiting",
        attempt: 0,
      });

      // Update job in queue-3 to failed state
      await backend.updateJob({
        id: job4.id,
        state: "failed",
        failed_at: new Date(),
      });

      const queueCounts = await backend.countJobsByQueues();

      expect(Object.keys(queueCounts)).toHaveLength(3);

      expect(queueCounts["queue-1"]).toEqual({
        total: 2,
        waiting: 2,
        claimed: 0,
        running: 0,
        completed: 0,
        failed: 0,
        canceled: 0,
      });

      expect(queueCounts["queue-2"]).toEqual({
        total: 1,
        waiting: 0,
        claimed: 0,
        running: 0,
        completed: 1,
        failed: 0,
        canceled: 0,
      });

      expect(queueCounts["queue-3"]).toEqual({
        total: 1,
        waiting: 0,
        claimed: 0,
        running: 0,
        completed: 0,
        failed: 1,
        canceled: 0,
      });
    });

    it("should count all job states correctly for each queue", async () => {
      const states = ["waiting", "claimed", "running", "completed", "failed", "canceled"] as JobState[];

      // Create one job for each state in queue-1
      for (const state of states) {
        const job = await backend.createNewJob({
          queue: "queue-1",
          script: "test-script",
          class: "TestJob",
          args: [],
          constructor_args: [],
          state: "waiting",
          attempt: 0,
        });

        if (state !== "waiting") {
          const updateData: UpdateJobData = { id: job.id, state };

          // Add appropriate timestamp fields based on state
          switch (state) {
            case "claimed":
              updateData.claimed_at = new Date();
              break;
            case "running":
              updateData.attempted_at = new Date();
              break;
            case "completed":
              updateData.completed_at = new Date();
              break;
            case "failed":
              updateData.failed_at = new Date();
              break;
            case "canceled":
              updateData.canceled_at = new Date();
              break;
          }

          await backend.updateJob(updateData);
        }
      }

      // Create additional jobs in queue-2
      await backend.createNewJob({
        queue: "queue-2",
        script: "test-script",
        class: "TestJob",
        args: [],
        constructor_args: [],
        state: "waiting",
        attempt: 0,
      });

      const job2 = await backend.createNewJob({
        queue: "queue-2",
        script: "test-script",
        class: "TestJob",
        args: [],
        constructor_args: [],
        state: "waiting",
        attempt: 0,
      });

      await backend.updateJob({
        id: job2.id,
        state: "completed",
        completed_at: new Date(),
      });

      const queueCounts = await backend.countJobsByQueues();

      expect(Object.keys(queueCounts)).toHaveLength(2);

      expect(queueCounts["queue-1"].total).toBe(6);
      expect(queueCounts["queue-1"].waiting).toBe(1);
      expect(queueCounts["queue-1"].claimed).toBe(1);
      expect(queueCounts["queue-1"].running).toBe(1);
      expect(queueCounts["queue-1"].completed).toBe(1);
      expect(queueCounts["queue-1"].failed).toBe(1);
      expect(queueCounts["queue-1"].canceled).toBe(1);

      expect(queueCounts["queue-2"].total).toBe(2);
      expect(queueCounts["queue-2"].waiting).toBe(1);
      expect(queueCounts["queue-2"].completed).toBe(1);
      expect(queueCounts["queue-2"].claimed).toBe(0);
      expect(queueCounts["queue-2"].running).toBe(0);
      expect(queueCounts["queue-2"].failed).toBe(0);
      expect(queueCounts["queue-2"].canceled).toBe(0);
    });

    it("should handle multiple jobs of the same state in different queues", async () => {
      // Create multiple waiting jobs in different queues
      for (let i = 0; i < 3; i++) {
        await backend.createNewJob({
          queue: "bulk-queue-1",
          script: "test-script",
          class: "TestJob",
          args: [{ index: i }],
          constructor_args: [],
          state: "waiting",
          attempt: 0,
        });
      }

      for (let i = 0; i < 2; i++) {
        await backend.createNewJob({
          queue: "bulk-queue-2",
          script: "test-script",
          class: "TestJob",
          args: [{ index: i }],
          constructor_args: [],
          state: "waiting",
          attempt: 0,
        });
      }

      const queueCounts = await backend.countJobsByQueues();

      expect(Object.keys(queueCounts)).toHaveLength(2);

      expect(queueCounts["bulk-queue-1"]).toEqual({
        total: 3,
        waiting: 3,
        claimed: 0,
        running: 0,
        completed: 0,
        failed: 0,
        canceled: 0,
      });

      expect(queueCounts["bulk-queue-2"]).toEqual({
        total: 2,
        waiting: 2,
        claimed: 0,
        running: 0,
        completed: 0,
        failed: 0,
        canceled: 0,
      });
    });

    it("should include queues that exist in queue config but have no jobs", async () => {
      // Create a queue configuration first
      await backend.createNewQueue({
        name: "empty-queue",
        concurrency: 1,
        priority: 100,
      });

      // Create a job in a different queue
      await backend.createNewJob({
        queue: "job-queue",
        script: "test-script",
        class: "TestJob",
        args: [],
        constructor_args: [],
        state: "waiting",
        attempt: 0,
      });

      const queueCounts = await backend.countJobsByQueues();

      expect(Object.keys(queueCounts)).toHaveLength(2);

      expect(queueCounts["empty-queue"]).toEqual({
        total: 0,
        waiting: 0,
        claimed: 0,
        running: 0,
        completed: 0,
        failed: 0,
        canceled: 0,
      });

      expect(queueCounts["job-queue"]).toEqual({
        total: 1,
        waiting: 1,
        claimed: 0,
        running: 0,
        completed: 0,
        failed: 0,
        canceled: 0,
      });
    });

    it("should handle queues with special characters in names", async () => {
      const specialQueueName = "queue-with-special_chars.and@symbols";

      await backend.createNewJob({
        queue: specialQueueName,
        script: "test-script",
        class: "TestJob",
        args: [],
        constructor_args: [],
        state: "waiting",
        attempt: 0,
      });

      const queueCounts = await backend.countJobsByQueues();

      expect(queueCounts).toHaveProperty(specialQueueName);
      expect(queueCounts[specialQueueName]).toEqual({
        total: 1,
        waiting: 1,
        claimed: 0,
        running: 0,
        completed: 0,
        failed: 0,
        canceled: 0,
      });
    });

    it("should maintain correct counts when jobs are updated between states", async () => {
      // Create jobs and track their state changes
      const job1 = await backend.createNewJob({
        queue: "dynamic-queue",
        script: "test-script",
        class: "TestJob",
        args: [],
        constructor_args: [],
        state: "waiting",
        attempt: 0,
      });

      await backend.createNewJob({
        queue: "dynamic-queue",
        script: "test-script",
        class: "TestJob",
        args: [],
        constructor_args: [],
        state: "waiting",
        attempt: 0,
      });

      // Initial state: 2 waiting
      let queueCounts = await backend.countJobsByQueues();
      expect(queueCounts["dynamic-queue"].waiting).toBe(2);
      expect(queueCounts["dynamic-queue"].claimed).toBe(0);

      // Update one to claimed
      await backend.updateJob({
        id: job1.id,
        state: "claimed",
        claimed_at: new Date(),
      });

      queueCounts = await backend.countJobsByQueues();
      expect(queueCounts["dynamic-queue"].waiting).toBe(1);
      expect(queueCounts["dynamic-queue"].claimed).toBe(1);
      expect(queueCounts["dynamic-queue"].total).toBe(2);

      // Update to running
      await backend.updateJob({
        id: job1.id,
        state: "running",
        attempted_at: new Date(),
      });

      queueCounts = await backend.countJobsByQueues();
      expect(queueCounts["dynamic-queue"].waiting).toBe(1);
      expect(queueCounts["dynamic-queue"].claimed).toBe(0);
      expect(queueCounts["dynamic-queue"].running).toBe(1);
      expect(queueCounts["dynamic-queue"].total).toBe(2);

      // Update to completed
      await backend.updateJob({
        id: job1.id,
        state: "completed",
        completed_at: new Date(),
      });

      queueCounts = await backend.countJobsByQueues();
      expect(queueCounts["dynamic-queue"].waiting).toBe(1);
      expect(queueCounts["dynamic-queue"].running).toBe(0);
      expect(queueCounts["dynamic-queue"].completed).toBe(1);
      expect(queueCounts["dynamic-queue"].total).toBe(2);
    });

    it("should handle empty queue names gracefully", async () => {
      // Some edge cases with queue names
      await backend.createNewJob({
        queue: "",
        script: "test-script",
        class: "TestJob",
        args: [],
        constructor_args: [],
        state: "waiting",
        attempt: 0,
      });

      const queueCounts = await backend.countJobsByQueues();

      expect(queueCounts).toHaveProperty("");
      expect(queueCounts[""]).toEqual({
        total: 1,
        waiting: 1,
        claimed: 0,
        running: 0,
        completed: 0,
        failed: 0,
        canceled: 0,
      });
    });
  });
}
