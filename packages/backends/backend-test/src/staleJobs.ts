import { NewJobData } from "@sidequest/backend";
import { describe, it } from "vitest";
import { backend } from "./backend";

export default function defineStaleJobsTestSuite() {
  describe("staleJobs", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should not find any stale job", async () => {
      const job: NewJobData = {
        queue: "default",
        class: "TestJob",
        args: [{ foo: "bar" }],
        constructor_args: [{}],
        state: "waiting",
        script: "test.js",
        attempt: 0,
        max_attempts: 5,
      };

      let insertedJob = await backend.createNewJob(job);

      insertedJob = await backend.createNewJob(job);
      await backend.updateJob({ ...insertedJob, state: "canceled" });

      insertedJob = await backend.createNewJob(job);
      await backend.updateJob({ ...insertedJob, state: "claimed", claimed_at: new Date() });

      insertedJob = await backend.createNewJob(job);
      await backend.updateJob({ ...insertedJob, state: "completed" });

      insertedJob = await backend.createNewJob(job);
      await backend.updateJob({ ...insertedJob, state: "failed" });

      insertedJob = await backend.createNewJob(job);
      await backend.updateJob({ ...insertedJob, state: "running", attempted_at: new Date(), timeout: 1000000 });

      insertedJob = await backend.createNewJob(job);
      await backend.updateJob({ ...insertedJob, state: "running", attempted_at: new Date() });

      const result = await backend.staleJobs();
      expect(result).toHaveLength(0);
    });

    it("should find claimed stale job", async () => {
      const job: NewJobData = {
        queue: "default",
        class: "TestJob",
        args: [{ foo: "bar" }],
        constructor_args: [{}],
        state: "waiting",
        script: "test.js",
        attempt: 0,
        max_attempts: 5,
      };

      let insertedJob = await backend.createNewJob(job);

      insertedJob = await backend.createNewJob(job);
      await backend.updateJob({ ...insertedJob, state: "canceled", claimed_at: new Date(2000, 0, 1) });

      insertedJob = await backend.createNewJob(job);
      await backend.updateJob({ ...insertedJob, state: "claimed", claimed_at: new Date(2000, 0, 1) });

      insertedJob = await backend.createNewJob(job);
      await backend.updateJob({ ...insertedJob, state: "completed", claimed_at: new Date(2000, 0, 1) });

      insertedJob = await backend.createNewJob(job);
      await backend.updateJob({ ...insertedJob, state: "failed", claimed_at: new Date(2000, 0, 1) });

      insertedJob = await backend.createNewJob(job);
      await backend.updateJob({
        ...insertedJob,
        state: "running",
        claimed_at: new Date(2000, 0, 1),
        attempted_at: new Date(),
        timeout: 1000000,
      });

      insertedJob = await backend.createNewJob(job);
      await backend.updateJob({
        ...insertedJob,
        state: "running",
        claimed_at: new Date(2000, 0, 1),
        attempted_at: new Date(),
      });

      const result = await backend.staleJobs();
      expect(result).toHaveLength(1);
    });

    it("should find running stale job without timeout", async () => {
      const job: NewJobData = {
        queue: "default",
        class: "TestJob",
        args: [{ foo: "bar" }],
        constructor_args: [{}],
        state: "waiting",
        script: "test.js",
        attempt: 0,
        max_attempts: 5,
      };

      let insertedJob = await backend.createNewJob(job);

      insertedJob = await backend.createNewJob(job);
      await backend.updateJob({ ...insertedJob, state: "canceled", attempted_at: new Date(2000, 0, 1) });

      insertedJob = await backend.createNewJob(job);
      await backend.updateJob({ ...insertedJob, state: "claimed", attempted_at: new Date(2000, 0, 1) });

      insertedJob = await backend.createNewJob(job);
      await backend.updateJob({ ...insertedJob, state: "completed", attempted_at: new Date(2000, 0, 1) });

      insertedJob = await backend.createNewJob(job);
      await backend.updateJob({ ...insertedJob, state: "failed", attempted_at: new Date(2000, 0, 1) });

      insertedJob = await backend.createNewJob(job);
      await backend.updateJob({
        ...insertedJob,
        state: "running",
        attempted_at: new Date(),
        timeout: 1000000,
      });

      insertedJob = await backend.createNewJob(job);
      await backend.updateJob({ ...insertedJob, state: "running", attempted_at: new Date(2000, 0, 1) });

      const result = await backend.staleJobs();
      expect(result).toHaveLength(1);
    });

    it("should find running stale job with timeout", async () => {
      const job: NewJobData = {
        queue: "default",
        class: "TestJob",
        args: [{ foo: "bar" }],
        constructor_args: [{}],
        state: "waiting",
        script: "test.js",
        attempt: 0,
        max_attempts: 5,
      };

      let insertedJob = await backend.createNewJob(job);

      insertedJob = await backend.createNewJob(job);
      await backend.updateJob({ ...insertedJob, state: "canceled", attempted_at: new Date() });

      insertedJob = await backend.createNewJob(job);
      await backend.updateJob({ ...insertedJob, state: "claimed", attempted_at: new Date() });

      insertedJob = await backend.createNewJob(job);
      await backend.updateJob({ ...insertedJob, state: "completed", attempted_at: new Date() });

      insertedJob = await backend.createNewJob(job);
      await backend.updateJob({ ...insertedJob, state: "failed", attempted_at: new Date() });

      const now = new Date();
      insertedJob = await backend.createNewJob(job);
      await backend.updateJob({
        ...insertedJob,
        state: "running",
        attempted_at: new Date(now.getTime() - 1000001),
        timeout: 1000000,
      });

      insertedJob = await backend.createNewJob(job);
      await backend.updateJob({
        ...insertedJob,
        state: "running",
        attempted_at: new Date(now.getTime() - 5000),
        timeout: 1000000,
      });

      insertedJob = await backend.createNewJob(job);
      await backend.updateJob({ ...insertedJob, state: "running", attempted_at: new Date() });

      const result = await backend.staleJobs();
      expect(result).toHaveLength(1);
    });

    it("should find many stale jobs if ms very low", async () => {
      const job: NewJobData = {
        queue: "default",
        class: "TestJob",
        args: [{ foo: "bar" }],
        constructor_args: [{}],
        state: "waiting",
        script: "test.js",
        attempt: 0,
        max_attempts: 5,
      };

      let insertedJob = await backend.createNewJob(job);

      insertedJob = await backend.createNewJob(job);
      await backend.updateJob({ ...insertedJob, state: "canceled" });

      insertedJob = await backend.createNewJob(job);
      await backend.updateJob({ ...insertedJob, state: "claimed", claimed_at: new Date() });

      insertedJob = await backend.createNewJob(job);
      await backend.updateJob({ ...insertedJob, state: "completed" });

      insertedJob = await backend.createNewJob(job);
      await backend.updateJob({ ...insertedJob, state: "failed" });

      insertedJob = await backend.createNewJob(job);
      await backend.updateJob({ ...insertedJob, state: "running", attempted_at: new Date(), timeout: -1 });

      insertedJob = await backend.createNewJob(job);
      await backend.updateJob({ ...insertedJob, state: "running", attempted_at: new Date() });

      const result = await backend.staleJobs(-1, -1);
      expect(result).toHaveLength(3);
    });

    it("should respect maxStaleMs for claimed jobs", async () => {
      const job: NewJobData = {
        queue: "default",
        class: "TestJob",
        args: [{ foo: "bar" }],
        constructor_args: [{}],
        state: "waiting",
        script: "test.js",
        attempt: 0,
        max_attempts: 5,
      };

      // Create claimed job that's 5 minutes old
      let insertedJob = await backend.createNewJob(job);
      await backend.updateJob({
        ...insertedJob,
        state: "claimed",
        claimed_at: new Date(Date.now() - 5 * 60 * 1000),
      });

      // Create claimed job that's 2 minutes old
      insertedJob = await backend.createNewJob(job);
      await backend.updateJob({
        ...insertedJob,
        state: "claimed",
        claimed_at: new Date(Date.now() - 2 * 60 * 1000),
      });

      // Test with 3 minute threshold - should find 1 stale job
      const result1 = await backend.staleJobs(10 * 60 * 1000, 3 * 60 * 1000);
      expect(result1).toHaveLength(1);

      // Test with 6 minute threshold - should find 2 stale jobs
      const result2 = await backend.staleJobs(10 * 60 * 1000, 6 * 60 * 1000);
      expect(result2).toHaveLength(0);

      // Test with 1 minute threshold - should find 0 stale jobs
      const result3 = await backend.staleJobs(10 * 60 * 1000, 1 * 60 * 1000);
      expect(result3).toHaveLength(2);
    });

    it("should respect maxClaimedMs for running jobs", async () => {
      const job: NewJobData = {
        queue: "default",
        class: "TestJob",
        args: [{ foo: "bar" }],
        constructor_args: [{}],
        state: "waiting",
        script: "test.js",
        attempt: 0,
        max_attempts: 5,
      };

      // Create running job that's been running for 10 minutes
      let insertedJob = await backend.createNewJob(job);
      await backend.updateJob({
        ...insertedJob,
        state: "running",
        attempted_at: new Date(Date.now() - 10 * 60 * 1000),
      });

      // Create running job that's been running for 3 minutes
      insertedJob = await backend.createNewJob(job);
      await backend.updateJob({
        ...insertedJob,
        state: "running",
        attempted_at: new Date(Date.now() - 3 * 60 * 1000),
      });

      // Test with 5 minute running threshold - should find 1 stale job
      const result1 = await backend.staleJobs(5 * 60 * 1000, 15 * 60 * 1000);
      expect(result1).toHaveLength(1);

      // Test with 15 minute running threshold - should find 0 stale jobs
      const result2 = await backend.staleJobs(15 * 60 * 1000, 15 * 60 * 1000);
      expect(result2).toHaveLength(0);

      // Test with 2 minute running threshold - should find 2 stale jobs
      const result3 = await backend.staleJobs(2 * 60 * 1000, 15 * 60 * 1000);
      expect(result3).toHaveLength(2);
    });

    it("should handle boundary conditions for timing", async () => {
      const job: NewJobData = {
        queue: "default",
        class: "TestJob",
        args: [{ foo: "bar" }],
        constructor_args: [{}],
        state: "waiting",
        script: "test.js",
        attempt: 0,
        max_attempts: 5,
      };

      const now = Date.now();

      // Create jobs at exact boundary times
      let insertedJob = await backend.createNewJob(job);
      await backend.updateJob({
        ...insertedJob,
        state: "claimed",
        claimed_at: new Date(now - 5000), // Exactly 5 seconds ago
      });

      insertedJob = await backend.createNewJob(job);
      await backend.updateJob({
        ...insertedJob,
        state: "running",
        attempted_at: new Date(now - 3000), // Exactly 3 seconds ago
      });

      // Test with exact boundary values
      const result1 = await backend.staleJobs(3000, 5000);
      expect(result1).toHaveLength(0); // Jobs exactly at boundary should not be included

      const result2 = await backend.staleJobs(3001, 5001);
      expect(result2).toHaveLength(0); // Jobs just under boundary should not be included

      const result3 = await backend.staleJobs(2999, 4999);
      expect(result3).toHaveLength(2); // Jobs just over boundary should be included
    });

    it("should handle very short time differences", async () => {
      const job: NewJobData = {
        queue: "default",
        class: "TestJob",
        args: [{ foo: "bar" }],
        constructor_args: [{}],
        state: "waiting",
        script: "test.js",
        attempt: 0,
        max_attempts: 5,
      };

      const now = Date.now();

      // Create jobs with millisecond differences
      let insertedJob = await backend.createNewJob(job);
      await backend.updateJob({
        ...insertedJob,
        state: "claimed",
        claimed_at: new Date(now - 10),
      });

      insertedJob = await backend.createNewJob(job);
      await backend.updateJob({
        ...insertedJob,
        state: "claimed",
        claimed_at: new Date(now - 5),
      });

      insertedJob = await backend.createNewJob(job);
      await backend.updateJob({
        ...insertedJob,
        state: "running",
        attempted_at: new Date(now - 3),
      });

      // Test with very small thresholds
      const result1 = await backend.staleJobs(7, 7);
      expect(result1).toHaveLength(1); // Only the oldest claimed job

      const result2 = await backend.staleJobs(1, 4);
      expect(result2).toHaveLength(3); // All jobs
    });

    it("should handle different time scales (seconds vs minutes vs hours)", async () => {
      const job: NewJobData = {
        queue: "default",
        class: "TestJob",
        args: [{ foo: "bar" }],
        constructor_args: [{}],
        state: "waiting",
        script: "test.js",
        attempt: 0,
        max_attempts: 5,
      };

      // Create jobs at different time scales
      let insertedJob = await backend.createNewJob(job);
      await backend.updateJob({
        ...insertedJob,
        state: "claimed",
        claimed_at: new Date(Date.now() - 2 * 1000), // 2 seconds
      });

      insertedJob = await backend.createNewJob(job);
      await backend.updateJob({
        ...insertedJob,
        state: "claimed",
        claimed_at: new Date(Date.now() - 3 * 60 * 1000), // 3 minutes
      });

      insertedJob = await backend.createNewJob(job);
      await backend.updateJob({
        ...insertedJob,
        state: "running",
        attempted_at: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours
      });

      // Test with second-scale threshold
      const result1 = await backend.staleJobs(5 * 1000, 5 * 1000);
      expect(result1).toHaveLength(2); // 3-minute and 2-hour jobs

      // Test with minute-scale threshold
      const result2 = await backend.staleJobs(5 * 60 * 1000, 5 * 60 * 1000);
      expect(result2).toHaveLength(1); // Only 2-hour job

      // Test with hour-scale threshold
      const result3 = await backend.staleJobs(3 * 60 * 60 * 1000, 3 * 60 * 60 * 1000);
      expect(result3).toHaveLength(0); // No jobs old enough
    });
  });
}
