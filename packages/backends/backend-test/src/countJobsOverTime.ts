import { describe, expect, it } from "vitest";
import { backend } from "./backend";

export default function defineCountJobsOverTimeTestSuite() {
  describe("countJobsOverTime", () => {
    it("should throw error for invalid time range format", async () => {
      await expect(backend.countJobsOverTime("invalid")).rejects.toThrow();
      await expect(backend.countJobsOverTime("12x")).rejects.toThrow();
      await expect(backend.countJobsOverTime("")).rejects.toThrow();
    });

    it("should return correct number of time buckets with zero counts when no jobs exist", async () => {
      const result = await backend.countJobsOverTime("5m");

      expect(result).toHaveLength(5);
      result.forEach((bucket) => {
        expect(bucket).toHaveProperty("timestamp");
        expect(bucket.timestamp).toBeInstanceOf(Date);
        expect(bucket.total).toBe(0);
        expect(bucket.waiting).toBe(0);
        expect(bucket.claimed).toBe(0);
        expect(bucket.running).toBe(0);
        expect(bucket.completed).toBe(0);
        expect(bucket.failed).toBe(0);
        expect(bucket.canceled).toBe(0);
      });

      // Check that timestamps are in chronological order and properly spaced
      for (let i = 1; i < result.length; i++) {
        const timeDiff = result[i].timestamp.getTime() - result[i - 1].timestamp.getTime();
        expect(timeDiff).toBe(60 * 1000); // 1 minute in milliseconds
      }
    });

    it("should return correct number of time buckets for different time ranges", async () => {
      const resultMinutes = await backend.countJobsOverTime("3m");
      expect(resultMinutes).toHaveLength(3);

      const resultHours = await backend.countJobsOverTime("2h");
      expect(resultHours).toHaveLength(2);

      const resultDays = await backend.countJobsOverTime("4d");
      expect(resultDays).toHaveLength(4);
    });

    it("should count jobs correctly by state and time bucket", async () => {
      const now = new Date();
      const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000);
      const oneMinuteAgo = new Date(now.getTime() - 1 * 60 * 1000);

      // Create jobs with different timestamps
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

      const job3 = await backend.createNewJob({
        queue: "test-queue",
        script: "test-script",
        class: "TestJob",
        args: [],
        constructor_args: [],
        state: "waiting",
        attempt: 0,
      });

      // Update jobs to different states and times
      await backend.updateJob({
        id: job2.id,
        state: "completed",
        completed_at: twoMinutesAgo,
      });

      await backend.updateJob({
        id: job3.id,
        state: "failed",
        failed_at: oneMinuteAgo,
      });

      const result = await backend.countJobsOverTime("5m");

      expect(result).toHaveLength(5);

      // Find the most recent bucket (should have the waiting job)
      const mostRecentBucket = result[result.length - 1];
      expect(mostRecentBucket.waiting).toBeGreaterThanOrEqual(1);
      expect(mostRecentBucket.total).toBeGreaterThanOrEqual(1);

      // Check that we have some completed and failed jobs in the time range
      const totalCompleted = result.reduce((sum, bucket) => sum + bucket.completed, 0);
      const totalFailed = result.reduce((sum, bucket) => sum + bucket.failed, 0);
      const totalWaiting = result.reduce((sum, bucket) => sum + bucket.waiting, 0);

      expect(totalCompleted).toBeGreaterThanOrEqual(1);
      expect(totalFailed).toBeGreaterThanOrEqual(1);
      expect(totalWaiting).toBeGreaterThanOrEqual(1);

      // Verify total counts add up correctly for each bucket
      result.forEach((bucket) => {
        const calculatedTotal =
          bucket.waiting + bucket.claimed + bucket.running + bucket.completed + bucket.failed + bucket.canceled;
        expect(bucket.total).toBe(calculatedTotal);
      });
    });

    it("should handle hour-based time ranges correctly", async () => {
      const result = await backend.countJobsOverTime("24h");

      expect(result).toHaveLength(24);

      // Check that timestamps are spaced 1 hour apart
      for (let i = 1; i < result.length; i++) {
        const timeDiff = result[i].timestamp.getTime() - result[i - 1].timestamp.getTime();
        expect(timeDiff).toBe(60 * 60 * 1000); // 1 hour in milliseconds
      }

      // Verify each bucket has proper structure
      result.forEach((bucket) => {
        expect(bucket).toHaveProperty("timestamp");
        expect(bucket).toHaveProperty("total");
        expect(bucket).toHaveProperty("waiting");
        expect(bucket).toHaveProperty("claimed");
        expect(bucket).toHaveProperty("running");
        expect(bucket).toHaveProperty("completed");
        expect(bucket).toHaveProperty("failed");
        expect(bucket).toHaveProperty("canceled");
        expect(typeof bucket.total).toBe("number");
        expect(typeof bucket.waiting).toBe("number");
        expect(typeof bucket.claimed).toBe("number");
        expect(typeof bucket.running).toBe("number");
        expect(typeof bucket.completed).toBe("number");
        expect(typeof bucket.failed).toBe("number");
        expect(typeof bucket.canceled).toBe("number");
      });
    });

    it("should handle day-based time ranges correctly", async () => {
      const result = await backend.countJobsOverTime("7d");

      expect(result).toHaveLength(7);

      // Check that timestamps are spaced 1 day apart
      for (let i = 1; i < result.length; i++) {
        const timeDiff = result[i].timestamp.getTime() - result[i - 1].timestamp.getTime();
        expect(timeDiff).toBe(24 * 60 * 60 * 1000); // 1 day in milliseconds
      }
    });

    it("should use appropriate timestamp fields based on job state", async () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      // Create a job and update it through different states
      const job = await backend.createNewJob({
        queue: "test-queue",
        script: "test-script",
        class: "TestJob",
        args: [],
        constructor_args: [],
        state: "waiting",
        attempt: 0,
      });

      // Update to completed state with specific completed_at timestamp
      await backend.updateJob({
        id: job.id,
        state: "completed",
        completed_at: oneHourAgo,
      });

      const result = await backend.countJobsOverTime("2h");

      expect(result).toHaveLength(2);

      // The job should appear in the time bucket corresponding to when it was completed
      const totalCompleted = result.reduce((sum, bucket) => sum + bucket.completed, 0);
      expect(totalCompleted).toBe(1);
    });

    it("should return timestamps in chronological order", async () => {
      const result = await backend.countJobsOverTime("10m");

      expect(result).toHaveLength(10);

      for (let i = 1; i < result.length; i++) {
        expect(result[i].timestamp.getTime()).toBeGreaterThan(result[i - 1].timestamp.getTime());
      }

      // The last timestamp should be the most recent
      const lastTimestamp = result[result.length - 1].timestamp;
      const now = new Date();

      // Allow for some tolerance (within the last minute)
      const timeDifference = now.getTime() - lastTimestamp.getTime();
      expect(timeDifference).toBeLessThan(60 * 1000); // Less than 1 minute difference
    });

    it("should include all job states in each time bucket", async () => {
      const result = await backend.countJobsOverTime("3m");

      result.forEach((bucket) => {
        // Verify structure and types
        expect(bucket.timestamp).toBeInstanceOf(Date);
        expect(typeof bucket.total).toBe("number");
        expect(typeof bucket.waiting).toBe("number");
        expect(typeof bucket.claimed).toBe("number");
        expect(typeof bucket.running).toBe("number");
        expect(typeof bucket.completed).toBe("number");
        expect(typeof bucket.failed).toBe("number");
        expect(typeof bucket.canceled).toBe("number");

        // Verify all counts are non-negative
        expect(bucket.total).toBeGreaterThanOrEqual(0);
        expect(bucket.waiting).toBeGreaterThanOrEqual(0);
        expect(bucket.claimed).toBeGreaterThanOrEqual(0);
        expect(bucket.running).toBeGreaterThanOrEqual(0);
        expect(bucket.completed).toBeGreaterThanOrEqual(0);
        expect(bucket.failed).toBeGreaterThanOrEqual(0);
        expect(bucket.canceled).toBeGreaterThanOrEqual(0);
      });
    });

    it("should handle edge case with single time unit", async () => {
      const result = await backend.countJobsOverTime("1m");
      expect(result).toHaveLength(1);

      const resultHour = await backend.countJobsOverTime("1h");
      expect(resultHour).toHaveLength(1);

      const resultDay = await backend.countJobsOverTime("1d");
      expect(resultDay).toHaveLength(1);
    });

    it("should filter jobs correctly within the time range", async () => {
      const now = new Date();
      const veryOldTime = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000); // 10 days ago

      // Create a very old job
      const oldJob = await backend.createNewJob({
        queue: "test-queue",
        script: "test-script",
        class: "TestJob",
        args: [],
        constructor_args: [],
        state: "waiting",
        attempt: 0,
      });

      await backend.updateJob({
        id: oldJob.id,
        state: "completed",
        completed_at: veryOldTime,
      });

      // Create a recent job
      await backend.createNewJob({
        queue: "test-queue",
        script: "test-script",
        class: "TestJob",
        args: [],
        constructor_args: [],
        state: "waiting",
        attempt: 0,
      });

      const result = await backend.countJobsOverTime("5m");

      // The old job should not appear in the 5-minute window
      const totalCompleted = result.reduce((sum, bucket) => sum + bucket.completed, 0);
      expect(totalCompleted).toBe(0);

      // But the recent waiting job should appear
      const totalWaiting = result.reduce((sum, bucket) => sum + bucket.waiting, 0);
      expect(totalWaiting).toBeGreaterThanOrEqual(1);
    });
  });
}
