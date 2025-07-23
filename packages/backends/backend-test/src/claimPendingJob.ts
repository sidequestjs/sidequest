import { NewJobData } from "@sidequest/backend";
import { describe, it } from "vitest";
import { backend } from "./backend";

export default function defineClaimPendingJobTestSuite() {
  describe("claimPendingJob", () => {
    it("should claim a pending job and update its state", async () => {
      const twelve = new Date();
      twelve.setUTCDate(12);
      twelve.setUTCMonth(12);
      twelve.setUTCFullYear(2012);
      // Insert a waiting job
      const job: NewJobData = {
        queue: "default",
        class: "TestJob",
        args: [{ foo: "bar" }],
        constructor_args: [{}],
        state: "waiting",
        script: "test.js",
        attempt: 0,
        max_attempts: 5,
        timeout: 10,
        available_at: twelve,
        unique_digest: "test",
        uniqueness_config: {
          type: "alive",
        },
      };

      const insertedJob = await backend.createNewJob(job);
      const [claimedJob] = await backend.claimPendingJob("default");

      expect(claimedJob.queue).toBe(insertedJob.queue);
      expect(claimedJob.class).toBe(insertedJob.class);
      expect(claimedJob.args).toMatchObject(insertedJob.args);
      expect(claimedJob.constructor_args).toMatchObject(insertedJob.constructor_args);
      expect(claimedJob.available_at).toEqual(insertedJob.available_at);
      expect(claimedJob.inserted_at).toEqual(insertedJob.inserted_at);
      expect(claimedJob.script).toBe(insertedJob.script);
      expect(claimedJob.attempt).toBe(insertedJob.attempt);
      expect(claimedJob.max_attempts).toBe(insertedJob.max_attempts);
      expect(claimedJob.result).toBe(insertedJob.result);
      expect(claimedJob.errors).toBe(insertedJob.errors);
      expect(claimedJob.attempted_at).toBe(insertedJob.attempted_at);
      expect(claimedJob.completed_at).toBe(insertedJob.completed_at);
      expect(claimedJob.failed_at).toBe(insertedJob.failed_at);
      expect(claimedJob.cancelled_at).toBe(insertedJob.cancelled_at);
      expect(claimedJob.timeout).toBe(insertedJob.timeout);
      expect(claimedJob.unique_digest).toBe(insertedJob.unique_digest);
      expect(claimedJob.uniqueness_config).toMatchObject(insertedJob.uniqueness_config!);

      // These should have changed
      expect(claimedJob.state).toBe("claimed");
      expect(claimedJob.claimed_at).toEqual(expect.any(Date));
      expect(claimedJob.claimed_by).toEqual(expect.any(String));
    });

    it("should not claim a job which is not in pending state", async () => {
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
      await backend.updateJob({ ...insertedJob, state: "canceled" });

      insertedJob = await backend.createNewJob(job);
      await backend.updateJob({ ...insertedJob, state: "claimed" });

      insertedJob = await backend.createNewJob(job);
      await backend.updateJob({ ...insertedJob, state: "completed" });

      insertedJob = await backend.createNewJob(job);
      await backend.updateJob({ ...insertedJob, state: "failed" });

      insertedJob = await backend.createNewJob(job);
      await backend.updateJob({ ...insertedJob, state: "running" });

      const [claimedJob] = await backend.claimPendingJob("default");
      expect(claimedJob).toBe(undefined);
    });

    it("should not claim a job of a different queue", async () => {
      // Insert a new waiting job
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

      await backend.createNewJob(job);
      await backend.createNewJob({ ...job, queue: "default2" });

      const claimedJobs = await backend.claimPendingJob("default2", 2);
      expect(claimedJobs).toHaveLength(1);
    });

    it("should claim multiple jobs", async () => {
      // Insert a new waiting job
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

      await backend.createNewJob(job);
      await backend.createNewJob(job);

      const claimedJobs = await backend.claimPendingJob("default", 10);
      expect(claimedJobs).toHaveLength(2);
    });

    it("should not claim a job from a non-existing queue", async () => {
      // Insert a new waiting job
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

      await backend.createNewJob(job);
      await backend.createNewJob(job);

      const claimedJobs = await backend.claimPendingJob("does_not_exist", 10);
      expect(claimedJobs).toHaveLength(0);
    });

    it("should not claim a job when not job is in the DB", async () => {
      const [claimedJob] = await backend.claimPendingJob("default");
      expect(claimedJob).toBe(undefined);
    });
  });
}
