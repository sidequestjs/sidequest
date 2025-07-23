import { NewJobData } from "@sidequest/backend";
import { describe, it } from "vitest";
import { backend } from "./backend";

export default function defineGetJobTestSuite() {
  describe("getJob", () => {
    it("should get no job", async () => {
      const job = await backend.getJob(-1);
      expect(job).toBeFalsy();
    });

    it("should get a job", async () => {
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

      const foundJob = await backend.getJob(insertedJob.id);
      expect(foundJob).toBeTruthy();

      expect(foundJob?.errors).toBe(null);
      expect(foundJob?.args).toMatchObject([]);
      expect(foundJob?.constructor_args).toMatchObject([]);
    });

    it("should get a job with errors and args", async () => {
      // Insert a waiting job
      const job: NewJobData = {
        queue: "default",
        class: "TestJob",
        args: [{ test: true }],
        constructor_args: [{ test: true }],
        state: "waiting",
        script: "test.js",
        attempt: 0,
      };

      const insertedJob = await backend.createNewJob(job);
      await backend.updateJob({ ...insertedJob, errors: [{ message: "test", attempt_by: "test-runner" }] });

      const foundJob = await backend.getJob(insertedJob.id);
      expect(foundJob).toBeTruthy();

      expect(foundJob?.errors).toMatchObject([{ message: "test", attempt_by: "test-runner" }]);
      expect(foundJob?.args).toMatchObject([{ test: true }]);
      expect(foundJob?.constructor_args).toMatchObject([{ test: true }]);
    });
  });
}
