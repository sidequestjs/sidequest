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
        canceled_at: now,
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
        backoff_strategy: "fixed",
        retry_delay: 5000,
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

  describe("updateJobIfCurrent", () => {
    it("should return the current job when a matching update changes no values", async () => {
      const insertedJob = await backend.createNewJob({
        queue: "default",
        class: "TestJob",
        args: [],
        constructor_args: [],
        state: "waiting",
        script: "test.js",
        attempt: 0,
      });

      const updatedJob = await backend.updateJobIfCurrent(
        { id: insertedJob.id },
        {
          state: insertedJob.state,
          attempt: insertedJob.attempt,
          claimed_by: insertedJob.claimed_by,
          claimed_at: insertedJob.claimed_at,
          attempted_at: insertedJob.attempted_at,
        },
      );

      expect(updatedJob).toMatchObject(insertedJob);
    });

    it("should update a job whose execution fingerprint still matches", async () => {
      const insertedJob = await backend.createNewJob({
        queue: "default",
        class: "TestJob",
        args: [],
        constructor_args: [],
        state: "waiting",
        script: "test.js",
        attempt: 0,
      });

      const updatedJob = await backend.updateJobIfCurrent(
        { id: insertedJob.id, state: "claimed", claimed_by: "worker-a", claimed_at: new Date() },
        {
          state: insertedJob.state,
          attempt: insertedJob.attempt,
          claimed_by: insertedJob.claimed_by,
          claimed_at: insertedJob.claimed_at,
          attempted_at: insertedJob.attempted_at,
        },
      );

      expect(updatedJob).toMatchObject({ state: "claimed", claimed_by: "worker-a" });
    });

    it("should not update a newer execution that has the same state", async () => {
      const insertedJob = await backend.createNewJob({
        queue: "default",
        class: "TestJob",
        args: [],
        constructor_args: [],
        state: "waiting",
        script: "test.js",
        attempt: 0,
      });
      const oldExecution = await backend.updateJob({
        ...insertedJob,
        state: "running",
        attempt: 1,
        claimed_by: "worker-a",
        claimed_at: new Date(2000, 0, 1),
        attempted_at: new Date(2000, 0, 1),
      });
      const newExecution = await backend.updateJob({
        ...oldExecution,
        state: "running",
        attempt: 2,
        claimed_by: "worker-b",
        claimed_at: new Date(2000, 0, 2),
        attempted_at: new Date(2000, 0, 2),
      });

      const updatedJob = await backend.updateJobIfCurrent(
        { ...oldExecution, state: "waiting" },
        {
          state: oldExecution.state,
          attempt: oldExecution.attempt,
          claimed_by: oldExecution.claimed_by,
          claimed_at: oldExecution.claimed_at,
          attempted_at: oldExecution.attempted_at,
        },
      );

      expect(updatedJob).toBeUndefined();
      expect(await backend.getJob(insertedJob.id)).toMatchObject(newExecution);
    });
  });
}
