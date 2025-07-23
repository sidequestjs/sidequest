import { NewJobData } from "@sidequest/backend";
import { describe, it } from "vitest";
import { backend } from "./backend";

export default function defineDeleteFinishedJobsTestSuite() {
  describe("deleteFinishedJobs", () => {
    it("should delete failed, completed, and cancelled jobs", async () => {
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
      await backend.updateJob({ ...insertedJob, state: "canceled", cancelled_at: new Date(2000, 0, 1) });

      insertedJob = await backend.createNewJob(job);
      await backend.updateJob({ ...insertedJob, state: "claimed" });

      insertedJob = await backend.createNewJob(job);
      await backend.updateJob({ ...insertedJob, state: "completed", completed_at: new Date(2000, 0, 1) });

      insertedJob = await backend.createNewJob(job);
      await backend.updateJob({ ...insertedJob, state: "failed", failed_at: new Date(2000, 0, 1) });

      insertedJob = await backend.createNewJob(job);
      await backend.updateJob({ ...insertedJob, state: "running" });

      await backend.deleteFinishedJobs(new Date());

      const allJobs = await backend.listJobs({});
      expect(allJobs).toHaveLength(3);
    });

    it("should not delete failed, completed, and cancelled jobs if do not meet cutoff", async () => {
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
      await backend.updateJob({ ...insertedJob, state: "canceled", cancelled_at: new Date(2024, 0, 1) });

      insertedJob = await backend.createNewJob(job);
      await backend.updateJob({ ...insertedJob, state: "claimed" });

      insertedJob = await backend.createNewJob(job);
      await backend.updateJob({ ...insertedJob, state: "completed", completed_at: new Date(2024, 0, 1) });

      insertedJob = await backend.createNewJob(job);
      await backend.updateJob({ ...insertedJob, state: "failed", failed_at: new Date(2024, 0, 1) });

      insertedJob = await backend.createNewJob(job);
      await backend.updateJob({ ...insertedJob, state: "running" });

      await backend.deleteFinishedJobs(new Date(0));

      const allJobs = await backend.listJobs({});
      expect(allJobs).toHaveLength(6);
    });

    it("should not do anything if no jobs", async () => {
      await backend.deleteFinishedJobs(new Date(0));
      const allJobs = await backend.listJobs({});
      expect(allJobs).toHaveLength(0);
    });
  });
}
