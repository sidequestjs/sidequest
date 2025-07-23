import { NewJobData } from "@sidequest/backend";
import { describe, it } from "vitest";
import { backend } from "./backend";

export default function defineStaleJobsTestSuite() {
  describe("staleJobs", () => {
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
      await backend.updateJob({ ...insertedJob, state: "canceled", claimed_at: new Date(0) });

      insertedJob = await backend.createNewJob(job);
      await backend.updateJob({ ...insertedJob, state: "claimed", claimed_at: new Date(0) });

      insertedJob = await backend.createNewJob(job);
      await backend.updateJob({ ...insertedJob, state: "completed", claimed_at: new Date(0) });

      insertedJob = await backend.createNewJob(job);
      await backend.updateJob({ ...insertedJob, state: "failed", claimed_at: new Date(0) });

      insertedJob = await backend.createNewJob(job);
      await backend.updateJob({
        ...insertedJob,
        state: "running",
        claimed_at: new Date(0),
        attempted_at: new Date(),
        timeout: 1000000,
      });

      insertedJob = await backend.createNewJob(job);
      await backend.updateJob({ ...insertedJob, state: "running", claimed_at: new Date(0), attempted_at: new Date() });

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
      await backend.updateJob({ ...insertedJob, state: "canceled", attempted_at: new Date(0) });

      insertedJob = await backend.createNewJob(job);
      await backend.updateJob({ ...insertedJob, state: "claimed", attempted_at: new Date(0) });

      insertedJob = await backend.createNewJob(job);
      await backend.updateJob({ ...insertedJob, state: "completed", attempted_at: new Date(0) });

      insertedJob = await backend.createNewJob(job);
      await backend.updateJob({ ...insertedJob, state: "failed", attempted_at: new Date(0) });

      insertedJob = await backend.createNewJob(job);
      await backend.updateJob({
        ...insertedJob,
        state: "running",
        attempted_at: new Date(),
        timeout: 1000000,
      });

      insertedJob = await backend.createNewJob(job);
      await backend.updateJob({ ...insertedJob, state: "running", attempted_at: new Date(0) });

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
  });
}
