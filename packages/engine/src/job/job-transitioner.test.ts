import { sidequestTest, SidequestTestFixture } from "@/tests/fixture";
import {
  CancelTransition,
  CompleteTransition,
  FailTransition,
  JobData,
  RerunTransition,
  RetryTransition,
  RunTransition,
  SnoozeTransition,
} from "@sidequest/core";
import { JobTransitioner } from "./job-transitioner";

describe("JobTransitioner", () => {
  let jobData: JobData;

  beforeEach<SidequestTestFixture>(async ({ backend }) => {
    jobData = await backend.createNewJob({
      queue: "default",
      script: "./dummy-script.js",
      class: "DummyClass",
      state: "waiting",
      args: [],
      constructor_args: [],
      attempt: 1 as unknown as 0,
      max_attempts: 10,
    });
  });

  describe("transition application", () => {
    sidequestTest("applies a RunTransition when job is claimed", async ({ backend }) => {
      jobData = await backend.updateJob({ ...jobData, state: "claimed" });

      const transition = new RunTransition();
      const result = await JobTransitioner.apply(backend, jobData, transition);

      const updatedJobData = await backend.getJob(jobData.id ?? 0);
      expect(updatedJobData!.state).toEqual("running");
      expect(updatedJobData!.attempt).toEqual(2);
      expect(result.state).toEqual("running");
    });

    sidequestTest("applies a CancelTransition when job is waiting", async ({ backend }) => {
      const transition = new CancelTransition();
      const result = await JobTransitioner.apply(backend, jobData, transition);

      const updatedJobData = await backend.getJob(jobData.id ?? 0);
      expect(updatedJobData!.state).toEqual("canceled");
      expect(updatedJobData!.canceled_at).toBeInstanceOf(Date);
      expect(result.state).toEqual("canceled");
    });

    sidequestTest("applies a CancelTransition when job is running", async ({ backend }) => {
      jobData = await backend.updateJob({
        ...jobData,
        state: "running",
        attempted_at: new Date(),
      });

      const transition = new CancelTransition();
      const result = await JobTransitioner.apply(backend, jobData, transition);

      const updatedJobData = await backend.getJob(jobData.id ?? 0);
      expect(updatedJobData!.state).toEqual("canceled");
      expect(updatedJobData!.canceled_at).toBeInstanceOf(Date);
      expect(result.state).toEqual("canceled");
    });

    sidequestTest("applies a CompleteTransition when job is running", async ({ backend }) => {
      jobData = await backend.updateJob({
        ...jobData,
        state: "running",
        attempted_at: new Date(),
      });

      const transition = new CompleteTransition("success result");
      const result = await JobTransitioner.apply(backend, jobData, transition);

      const updatedJobData = await backend.getJob(jobData.id ?? 0);
      expect(updatedJobData!.state).toEqual("completed");
      expect(updatedJobData!.completed_at).toBeInstanceOf(Date);
      expect(updatedJobData!.result).toEqual("success result");
      expect(result.state).toEqual("completed");
    });

    sidequestTest("applies a FailTransition when job is running", async ({ backend }) => {
      jobData = await backend.updateJob({
        ...jobData,
        state: "running",
        attempted_at: new Date(),
      });

      const transition = new FailTransition("Test error");
      const result = await JobTransitioner.apply(backend, jobData, transition);

      const updatedJobData = await backend.getJob(jobData.id ?? 0);
      expect(updatedJobData!.state).toEqual("failed");
      expect(updatedJobData!.failed_at).toBeInstanceOf(Date);
      expect(updatedJobData!.errors).toHaveLength(1);
      expect(updatedJobData!.errors![0].message).toEqual("Test error");
      expect(result.state).toEqual("failed");
    });

    sidequestTest("applies a RetryTransition when job is running", async ({ backend }) => {
      jobData = await backend.updateJob({
        ...jobData,
        state: "running",
        attempted_at: new Date(),
        attempt: 1,
      });

      const transition = new RetryTransition("Retry test", 1000);
      const result = await JobTransitioner.apply(backend, jobData, transition);

      const updatedJobData = await backend.getJob(jobData.id ?? 0);
      expect(updatedJobData!.state).toEqual("waiting");
      expect(updatedJobData!.available_at).toBeInstanceOf(Date);
      expect(updatedJobData!.errors).toHaveLength(1);
      expect(result.state).toEqual("waiting");
    });

    sidequestTest("applies a SnoozeTransition when job is running", async ({ backend }) => {
      jobData = await backend.updateJob({
        ...jobData,
        state: "running",
        attempted_at: new Date(),
      });

      const transition = new SnoozeTransition(5000);
      const result = await JobTransitioner.apply(backend, jobData, transition);

      const updatedJobData = await backend.getJob(jobData.id ?? 0);
      expect(updatedJobData!.state).toEqual("waiting");
      expect(updatedJobData!.available_at).toBeInstanceOf(Date);
      expect(result.state).toEqual("waiting");
    });

    sidequestTest("applies a RerunTransition when job is completed", async ({ backend }) => {
      jobData = await backend.updateJob({
        ...jobData,
        state: "completed",
        completed_at: new Date(),
        result: "previous result",
      });

      const transition = new RerunTransition();
      const result = await JobTransitioner.apply(backend, jobData, transition);

      const updatedJobData = await backend.getJob(jobData.id ?? 0);
      expect(updatedJobData!.state).toEqual("waiting");
      expect(updatedJobData!.available_at).toBeInstanceOf(Date);
      expect(result.state).toEqual("waiting");
    });
  });

  describe("transition rejection", () => {
    sidequestTest("does not apply RunTransition when job is not claimed", async ({ backend }) => {
      const originalJobData = { ...jobData };

      const transition = new RunTransition();
      const result = await JobTransitioner.apply(backend, jobData, transition);

      // Should return the original job data unchanged
      expect(result).toEqual(originalJobData);
      expect(result.state).toEqual("waiting");
      expect(result.attempt).toEqual(originalJobData.attempt);

      // Database should also be unchanged
      const dbJobData = await backend.getJob(jobData.id ?? 0);
      expect(dbJobData!.state).toEqual("waiting");
      expect(dbJobData!.attempt).toEqual(originalJobData.attempt);
    });

    sidequestTest("does not apply CancelTransition when job is already completed", async ({ backend }) => {
      jobData = await backend.updateJob({
        ...jobData,
        state: "completed",
        completed_at: new Date(),
        result: "success",
      });
      const originalJobData = await backend.getJob(jobData.id ?? 0);

      const transition = new CancelTransition();
      const result = await JobTransitioner.apply(backend, jobData, transition);

      // Should return the job data unchanged
      expect(result.state).toEqual("completed");
      expect(result.canceled_at).toBeNull();

      // Database should also be unchanged
      const dbJobData = await backend.getJob(jobData.id ?? 0);
      expect(dbJobData!.state).toEqual("completed");
      expect(dbJobData!.canceled_at).toBeNull();
      expect(dbJobData!.completed_at).toEqual(originalJobData!.completed_at);
    });

    sidequestTest("does not apply CancelTransition when job is already failed", async ({ backend }) => {
      jobData = await backend.updateJob({
        ...jobData,
        state: "failed",
        failed_at: new Date(),
        errors: [{ message: "Original error", stack: null }],
      });
      const originalJobData = await backend.getJob(jobData.id ?? 0);

      const transition = new CancelTransition();
      const result = await JobTransitioner.apply(backend, jobData, transition);

      // Should return the job data unchanged
      expect(result.state).toEqual("failed");
      expect(result.canceled_at).toBeNull();

      // Database should also be unchanged
      const dbJobData = await backend.getJob(jobData.id ?? 0);
      expect(dbJobData!.state).toEqual("failed");
      expect(dbJobData!.canceled_at).toBeNull();
      expect(dbJobData!.failed_at).toEqual(originalJobData!.failed_at);
    });

    sidequestTest("does not apply CompleteTransition when job is not running", async ({ backend }) => {
      const transition = new CompleteTransition("result");
      const result = await JobTransitioner.apply(backend, jobData, transition);

      // Should return the original job data unchanged
      expect(result.state).toEqual("waiting");
      expect(result.completed_at).toBeNull();
      expect(result.result).toBeNull();

      // Database should also be unchanged
      const dbJobData = await backend.getJob(jobData.id ?? 0);
      expect(dbJobData!.state).toEqual("waiting");
      expect(dbJobData!.completed_at).toBeNull();
    });

    sidequestTest("does not apply FailTransition when job is completed", async ({ backend }) => {
      jobData = await backend.updateJob({
        ...jobData,
        state: "completed",
        completed_at: new Date(),
        result: "success",
      });
      const originalJobData = await backend.getJob(jobData.id ?? 0);

      const transition = new FailTransition("Should not apply");
      const result = await JobTransitioner.apply(backend, jobData, transition);

      // Should return the job data unchanged
      expect(result.state).toEqual("completed");
      expect(result.failed_at).toBeNull();

      // Database should also be unchanged
      const dbJobData = await backend.getJob(jobData.id ?? 0);
      expect(dbJobData!.state).toEqual("completed");
      expect(dbJobData!.failed_at).toBeNull();
      expect(dbJobData!.completed_at).toEqual(originalJobData!.completed_at);
    });

    sidequestTest("does not apply RerunTransition when job is waiting", async ({ backend }) => {
      const originalJobData = { ...jobData };

      const transition = new RerunTransition();
      const result = await JobTransitioner.apply(backend, jobData, transition);

      // Should return the original job data unchanged
      expect(result.state).toEqual("waiting");
      expect(result.max_attempts).toEqual(originalJobData.max_attempts);

      // Database should also be unchanged
      const dbJobData = await backend.getJob(jobData.id ?? 0);
      expect(dbJobData!.state).toEqual("waiting");
      expect(dbJobData!.max_attempts).toEqual(originalJobData.max_attempts);
    });

    sidequestTest("does not apply RerunTransition when job is running", async ({ backend }) => {
      jobData = await backend.updateJob({
        ...jobData,
        state: "running",
        attempted_at: new Date(),
      });
      const originalJobData = await backend.getJob(jobData.id ?? 0);

      const transition = new RerunTransition();
      const result = await JobTransitioner.apply(backend, jobData, transition);

      // Should return the job data unchanged
      expect(result.state).toEqual("running");
      expect(result.max_attempts).toEqual(originalJobData!.max_attempts);

      // Database should also be unchanged
      const dbJobData = await backend.getJob(jobData.id ?? 0);
      expect(dbJobData!.state).toEqual("running");
      expect(dbJobData!.max_attempts).toEqual(originalJobData!.max_attempts);
    });
  });

  describe("edge cases", () => {
    sidequestTest("handles transitions that should run but don't change job state", async ({ backend }) => {
      jobData = await backend.updateJob({
        ...jobData,
        state: "running",
        attempted_at: new Date(),
      });

      // Create a custom transition that should run but doesn't change anything
      class NoOpTransition extends CompleteTransition {
        apply(job: JobData): JobData {
          // Don't change anything, just return the job as-is
          return { ...job };
        }
      }

      const transition = new NoOpTransition();
      const result = await JobTransitioner.apply(backend, jobData, transition);

      // Should still update in the database even though nothing changed
      expect(result.state).toEqual("running");

      const dbJobData = await backend.getJob(jobData.id ?? 0);
      expect(dbJobData!.state).toEqual("running");
    });

    sidequestTest("preserves job data integrity when transition is not applied", async ({ backend }) => {
      const originalJobData = { ...jobData };

      // Try to apply a transition that shouldn't run
      const transition = new RunTransition(); // Should only run for claimed jobs
      const result = await JobTransitioner.apply(backend, jobData, transition);

      // Verify all fields are preserved exactly
      expect(result).toEqual(originalJobData);
      expect(result.id).toEqual(originalJobData.id);
      expect(result.queue).toEqual(originalJobData.queue);
      expect(result.state).toEqual(originalJobData.state);
      expect(result.class).toEqual(originalJobData.class);
      expect(result.script).toEqual(originalJobData.script);
      expect(result.attempt).toEqual(originalJobData.attempt);
      expect(result.max_attempts).toEqual(originalJobData.max_attempts);
    });
  });
});
