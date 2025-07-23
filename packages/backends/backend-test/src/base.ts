import { NewJobData } from "@sidequest/backend";
import { describe, it } from "vitest";
import { backend } from ".";

export default function defineTestSuite() {
  describe("createNewJob", () => {
    it("should insert new job with bare minimum", async () => {
      // Insert a waiting job
      const job: NewJobData = {
        queue: "default",
        class: "TestJob",
        args: [],
        constructor_args: [],
        state: "waiting",
        script: "test.js",
        attempt: 0,
      };

      const insertedJob = await backend.createNewJob(job);

      expect(insertedJob.queue).toBe("default");
      expect(insertedJob.class).toBe("TestJob");
      expect(insertedJob.args).toMatchObject([]);
      expect(insertedJob.constructor_args).toMatchObject([]);
      expect(insertedJob.state).toBe("waiting");
      expect(insertedJob.available_at).toEqual(expect.any(Date));
      expect(insertedJob.inserted_at).toEqual(expect.any(Date));
      expect(insertedJob.script).toBe("test.js");
      expect(insertedJob.attempt).toBe(0);
      expect(insertedJob.max_attempts).toBe(5);
      expect(insertedJob.result).toBe(null);
      expect(insertedJob.errors).toBe(null);
      expect(insertedJob.attempted_at).toBe(null);
      expect(insertedJob.completed_at).toBe(null);
      expect(insertedJob.failed_at).toBe(null);
      expect(insertedJob.cancelled_at).toBe(null);
      expect(insertedJob.claimed_at).toBe(null);
      expect(insertedJob.claimed_by).toBe(null);
      expect(insertedJob.timeout).toBe(null);
      expect(insertedJob.unique_digest).toBe(null);
      expect(insertedJob.uniqueness_config).toBe(null);
    });

    it("should insert a new job with all optionals", async () => {
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

      expect(insertedJob.queue).toBe("default");
      expect(insertedJob.class).toBe("TestJob");
      expect(insertedJob.args).toMatchObject([{ foo: "bar" }]);
      expect(insertedJob.constructor_args).toMatchObject([{}]);
      expect(insertedJob.state).toBe("waiting");
      expect(insertedJob.available_at).toEqual(twelve);
      expect(insertedJob.inserted_at).toEqual(expect.any(Date));
      expect(insertedJob.script).toBe("test.js");
      expect(insertedJob.attempt).toBe(0);
      expect(insertedJob.max_attempts).toBe(5);
      expect(insertedJob.result).toBe(null);
      expect(insertedJob.errors).toBe(null);
      expect(insertedJob.attempted_at).toBe(null);
      expect(insertedJob.completed_at).toBe(null);
      expect(insertedJob.failed_at).toBe(null);
      expect(insertedJob.cancelled_at).toBe(null);
      expect(insertedJob.claimed_at).toBe(null);
      expect(insertedJob.claimed_by).toBe(null);
      expect(insertedJob.timeout).toBe(10);
      expect(insertedJob.unique_digest).toBe("test");
      expect(insertedJob.uniqueness_config).toMatchObject({ type: "alive" });
    });
  });

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

    it("should not claim a job when not job is in the DB", async () => {
      const [claimedJob] = await backend.claimPendingJob("default");
      expect(claimedJob).toBe(undefined);
    });
  });
}
