import { NewJobData } from "@sidequest/backend";
import { JobData, toErrorData } from "@sidequest/core";
import { describe, it } from "vitest";
import { backend } from "./backend";

export default function defineUpdateJobTestSuite() {
  describe("updateJob", () => {
    it("should update nothing on job", async () => {
      // Insert a waiting job
      const job: NewJobData = {
        queue: "default",
        class: "TestJob",
        args: [],
        constructor_args: [],
        state: "waiting",
        script: "test.js",
        attempt: 0,
        timeout: 10000,
        available_at: new Date(),
        max_attempts: 50,
        unique_digest: "test",
        uniqueness_config: { type: "alive" },
      };

      const insertedJob = await backend.createNewJob(job);
      const updatedJob = await backend.updateJob({ id: insertedJob.id });

      expect(updatedJob).toMatchObject(insertedJob);
    });

    it("should nullify on update", async () => {
      // Insert a waiting job
      const job: NewJobData = {
        queue: "default",
        class: "TestJob",
        args: [],
        constructor_args: [],
        state: "waiting",
        script: "test.js",
        attempt: 0,
        timeout: 10000,
        available_at: new Date(),
        max_attempts: 50,
        unique_digest: "test",
        uniqueness_config: { type: "alive" },
      };

      const insertedJob = await backend.createNewJob(job);
      const updatedJob = await backend.updateJob({
        id: insertedJob.id,
        timeout: null,
        unique_digest: null,
        uniqueness_config: null,
      });

      expect(insertedJob.timeout).toBeTruthy();
      expect(insertedJob.unique_digest).toBeTruthy();
      expect(insertedJob.uniqueness_config).toBeTruthy();

      expect(updatedJob.timeout).toBe(null);
      expect(updatedJob.unique_digest).toBe(null);
      expect(updatedJob.uniqueness_config).toBe(null);
    });

    it("should update values", async () => {
      // Insert a waiting job
      const job: NewJobData = {
        queue: "default",
        class: "TestJob",
        args: [],
        constructor_args: [],
        state: "waiting",
        script: "test.js",
        attempt: 0,
        timeout: 10000,
        available_at: new Date(),
        max_attempts: 50,
        unique_digest: "test",
        uniqueness_config: { type: "alive" },
      };

      const insertedJob = await backend.createNewJob(job);

      const now = new Date();
      const newData: JobData = {
        id: insertedJob.id,
        timeout: 5,
        unique_digest: "test2",
        uniqueness_config: { type: "dead" },
        args: ["test_args"],
        attempt: 5,
        attempted_at: now,
        available_at: now,
        cancelled_at: now,
        claimed_at: now,
        claimed_by: "test_claimedby",
        class: "TestJob2",
        completed_at: now,
        constructor_args: ["test_cargs"],
        errors: [toErrorData(new Error("test_error"))],
        failed_at: now,
        inserted_at: now,
        max_attempts: 5,
        queue: "default2",
        result: "test_result",
        script: "test2.js",
        state: "canceled",
      };
      const updatedJob = await backend.updateJob(newData);
      expect(updatedJob).toMatchObject(newData);
    });

    it("should error on job not found", async () => {
      // Insert a waiting job
      const job: NewJobData = {
        queue: "default",
        class: "TestJob",
        args: [],
        constructor_args: [],
        state: "waiting",
        script: "test.js",
        attempt: 0,
        timeout: 10000,
        available_at: new Date(),
        max_attempts: 50,
        unique_digest: "test",
        uniqueness_config: { type: "alive" },
      };

      await backend.createNewJob(job);

      await expect(backend.updateJob({ id: -1 })).rejects.toThrow();
    });
  });
}
