import { JobCounts, UpdateJobData } from "@sidequest/backend";
import { JobState } from "packages/core/dist";
import { describe, expect, it } from "vitest";
import { backend } from "./backend";

export default function defineCountJobsTestSuite() {
  describe("countJobs", () => {
    it("should return zero counts when no jobs exist", async () => {
      const counts = await backend.countJobs();

      const expectedCounts: JobCounts = {
        total: 0,
        waiting: 0,
        claimed: 0,
        running: 0,
        completed: 0,
        failed: 0,
        canceled: 0,
      };

      expect(counts).toEqual(expectedCounts);
    });

    it("should count jobs correctly by state", async () => {
      // Create jobs in different states
      await backend.createNewJob({
        queue: "test-queue",
        script: "test-script",
        class: "TestJob",
        args: [],
        constructor_args: [],
        state: "waiting",
        attempt: 0,
      });

      const job2 = await backend.createNewJob({
        queue: "test-queue",
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
        queue: "test-queue",
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

      const counts = await backend.countJobs();

      expect(counts.total).toBe(3);
      expect(counts.waiting).toBe(1);
      expect(counts.completed).toBe(1);
      expect(counts.failed).toBe(1);
      expect(counts.claimed).toBe(0);
      expect(counts.running).toBe(0);
      expect(counts.canceled).toBe(0);
    });

    it("should count all job states correctly", async () => {
      const states = ["waiting", "claimed", "running", "completed", "failed", "canceled"] as JobState[];

      // Create one job for each state
      for (const state of states) {
        const job = await backend.createNewJob({
          queue: "test-queue",
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

      const counts = await backend.countJobs();

      expect(counts.total).toBe(6);
      expect(counts.waiting).toBe(1);
      expect(counts.claimed).toBe(1);
      expect(counts.running).toBe(1);
      expect(counts.completed).toBe(1);
      expect(counts.failed).toBe(1);
      expect(counts.canceled).toBe(1);
    });

    it("should filter jobs by time range", async () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

      // Create jobs with different attempted_at times
      const job1 = await backend.createNewJob({
        queue: "test-queue",
        script: "test-script",
        class: "TestJob",
        args: [],
        constructor_args: [],
        state: "waiting",
        attempt: 0,
      });

      await backend.updateJob({
        id: job1.id,
        state: "running",
        attempted_at: twoHoursAgo,
      });

      const job2 = await backend.createNewJob({
        queue: "test-queue",
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
        attempted_at: oneHourAgo,
        completed_at: oneHourAgo,
      });

      const job3 = await backend.createNewJob({
        queue: "test-queue",
        script: "test-script",
        class: "TestJob",
        args: [],
        constructor_args: [],
        state: "waiting",
        attempt: 0,
      });

      await backend.updateJob({
        id: job3.id,
        state: "failed",
        attempted_at: now,
        failed_at: now,
      });

      const job4 = await backend.createNewJob({
        queue: "test-queue",
        script: "test-script",
        class: "TestJob",
        args: [],
        constructor_args: [],
        state: "waiting",
        attempt: 0,
      });

      await backend.updateJob({
        id: job4.id,
        state: "claimed",
        claimed_at: now,
      });

      // Count jobs from 1.5 hours ago to now
      const timeRange = {
        from: new Date(now.getTime() - 1.5 * 60 * 60 * 1000),
        to: now,
      };

      const counts = await backend.countJobs(timeRange);

      expect(counts.total).toBe(3); // Should exclude the job from 2 hours ago
      expect(counts.completed).toBe(1);
      expect(counts.failed).toBe(1);
      expect(counts.claimed).toBe(1);
      expect(counts.running).toBe(0);
    });

    it("should filter jobs by from date only", async () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

      // Create jobs with different attempted_at times
      const job1 = await backend.createNewJob({
        queue: "test-queue",
        script: "test-script",
        class: "TestJob",
        args: [],
        constructor_args: [],
        state: "waiting",
        attempt: 0,
      });

      await backend.updateJob({
        id: job1.id,
        state: "completed",
        attempted_at: twoHoursAgo,
        completed_at: twoHoursAgo,
      });

      const job2 = await backend.createNewJob({
        queue: "test-queue",
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
        attempted_at: now,
        completed_at: now,
      });

      // Count jobs from 1 hour ago onwards
      const counts = await backend.countJobs({ from: oneHourAgo });

      expect(counts.total).toBe(1); // Should only include the recent job
      expect(counts.completed).toBe(1);
    });

    it("should filter jobs by to date only", async () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

      // Create jobs with different attempted_at times
      const job1 = await backend.createNewJob({
        queue: "test-queue",
        script: "test-script",
        class: "TestJob",
        args: [],
        constructor_args: [],
        state: "waiting",
        attempt: 0,
      });

      await backend.updateJob({
        id: job1.id,
        state: "completed",
        attempted_at: twoHoursAgo,
        completed_at: twoHoursAgo,
      });

      const job2 = await backend.createNewJob({
        queue: "test-queue",
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
        attempted_at: now,
        completed_at: now,
      });

      // Count jobs up to 1 hour ago
      const counts = await backend.countJobs({ to: oneHourAgo });

      expect(counts.total).toBe(1); // Should only include the older job
      expect(counts.completed).toBe(1);
    });

    it("should handle multiple jobs of the same state", async () => {
      // Create multiple waiting jobs
      for (let i = 0; i < 5; i++) {
        await backend.createNewJob({
          queue: "test-queue",
          script: "test-script",
          class: "TestJob",
          args: [{ index: i }],
          constructor_args: [],
          state: "waiting",
          attempt: 0,
        });
      }

      const counts = await backend.countJobs();

      expect(counts.total).toBe(5);
      expect(counts.waiting).toBe(5);
      expect(counts.claimed).toBe(0);
      expect(counts.running).toBe(0);
      expect(counts.completed).toBe(0);
      expect(counts.failed).toBe(0);
      expect(counts.canceled).toBe(0);
    });

    it("should return correct counts when no jobs match time range", async () => {
      const now = new Date();
      const job = await backend.createNewJob({
        queue: "test-queue",
        script: "test-script",
        class: "TestJob",
        args: [],
        constructor_args: [],
        state: "waiting",
        attempt: 0,
      });

      await backend.updateJob({
        id: job.id,
        state: "completed",
        attempted_at: now,
        completed_at: now,
      });

      // Filter for jobs in the future
      const futureDate = new Date(now.getTime() + 60 * 60 * 1000);
      const counts = await backend.countJobs({ from: futureDate });

      const expectedCounts: JobCounts = {
        total: 0,
        waiting: 0,
        claimed: 0,
        running: 0,
        completed: 0,
        failed: 0,
        canceled: 0,
      };

      expect(counts).toEqual(expectedCounts);
    });
  });
}
