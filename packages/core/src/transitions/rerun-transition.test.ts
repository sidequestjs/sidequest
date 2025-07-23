import { JobData } from "../schema";
import { RerunTransition } from "./rerun-transition";

describe("RerunTransition", () => {
  it("should rerun a completed job", () => {
    const job: JobData = {
      id: 1,
      queue: "default",
      state: "completed",
      class: "TestJob",
      script: "file:///test.js",
      args: ["arg1"],
      constructor_args: [],
      attempt: 1,
      max_attempts: 3,
      inserted_at: new Date("2024-01-01T00:00:00.000Z"),
      available_at: new Date("2024-01-01T00:00:00.000Z"),
      timeout: null,
      result: "success",
      errors: null,
      attempted_at: new Date("2024-01-01T01:00:00.000Z"),
      completed_at: new Date("2024-01-01T01:30:00.000Z"),
      failed_at: null,
      canceled_at: null,
      claimed_at: new Date("2024-01-01T01:00:00.000Z"),
      claimed_by: "worker-1",
      unique_digest: null,
      uniqueness_config: null,
    };

    const transition = new RerunTransition();
    const updatedJob = transition.apply(job);

    expect(updatedJob.state).toBe("waiting");
    expect(updatedJob.available_at).toBeInstanceOf(Date);
    expect(updatedJob.max_attempts).toBe(3); // Should not increase since attempt < max_attempts
  });

  it("should rerun a failed job", () => {
    const job: JobData = {
      id: 2,
      queue: "email",
      state: "failed",
      class: "EmailJob",
      script: "file:///email.js",
      args: ["test@example.com"],
      constructor_args: [],
      attempt: 2,
      max_attempts: 3,
      inserted_at: new Date("2024-01-01T00:00:00.000Z"),
      available_at: new Date("2024-01-01T00:00:00.000Z"),
      timeout: 30000,
      result: null,
      errors: [{ message: "Test error", stack: null }],
      attempted_at: new Date("2024-01-01T01:00:00.000Z"),
      completed_at: null,
      failed_at: new Date("2024-01-01T01:30:00.000Z"),
      canceled_at: null,
      claimed_at: new Date("2024-01-01T01:00:00.000Z"),
      claimed_by: "worker-2",
      unique_digest: "abc123",
      uniqueness_config: null,
    };

    const transition = new RerunTransition();
    const updatedJob = transition.apply(job);

    expect(updatedJob.state).toBe("waiting");
    expect(updatedJob.available_at).toBeInstanceOf(Date);
    expect(updatedJob.max_attempts).toBe(3); // Should not increase since attempt < max_attempts
  });

  it("should rerun a canceled job", () => {
    const job: JobData = {
      id: 3,
      queue: "processing",
      state: "canceled",
      class: "ProcessingJob",
      script: "file:///processing.js",
      args: [{ data: "test" }],
      constructor_args: [],
      attempt: 1,
      max_attempts: 5,
      inserted_at: new Date("2024-01-01T00:00:00.000Z"),
      available_at: new Date("2024-01-01T00:00:00.000Z"),
      timeout: 60000,
      result: null,
      errors: null,
      attempted_at: new Date("2024-01-01T01:00:00.000Z"),
      completed_at: null,
      failed_at: null,
      canceled_at: new Date("2024-01-01T01:15:00.000Z"),
      claimed_at: new Date("2024-01-01T01:00:00.000Z"),
      claimed_by: "worker-3",
      unique_digest: "def456",
      uniqueness_config: null,
    };

    const transition = new RerunTransition();
    const updatedJob = transition.apply(job);

    expect(updatedJob.state).toBe("waiting");
    expect(updatedJob.available_at).toBeInstanceOf(Date);
    expect(updatedJob.max_attempts).toBe(5); // Should not increase since attempt < max_attempts
  });

  it("should increase max_attempts when job has reached its limit", () => {
    const job: JobData = {
      id: 4,
      queue: "retry",
      state: "failed",
      class: "RetryJob",
      script: "file:///retry.js",
      args: [],
      constructor_args: [],
      attempt: 3,
      max_attempts: 3, // Job has reached max attempts
      inserted_at: new Date("2024-01-01T00:00:00.000Z"),
      available_at: new Date("2024-01-01T00:00:00.000Z"),
      timeout: null,
      result: null,
      errors: [{ message: "Max attempts reached", stack: null }],
      attempted_at: new Date("2024-01-01T01:00:00.000Z"),
      completed_at: null,
      failed_at: new Date("2024-01-01T01:30:00.000Z"),
      canceled_at: null,
      claimed_at: new Date("2024-01-01T01:00:00.000Z"),
      claimed_by: "worker-4",
      unique_digest: null,
      uniqueness_config: null,
    };

    const transition = new RerunTransition();
    const updatedJob = transition.apply(job);

    expect(updatedJob.state).toBe("waiting");
    expect(updatedJob.available_at).toBeInstanceOf(Date);
    expect(updatedJob.max_attempts).toBe(4); // Should increase to attempt + 1
  });

  it("should increase max_attempts when attempt exceeds max_attempts", () => {
    const job: JobData = {
      id: 5,
      queue: "test",
      state: "failed",
      class: "TestJob",
      script: "file:///test.js",
      args: [],
      constructor_args: [],
      attempt: 5,
      max_attempts: 3, // attempt > max_attempts somehow
      inserted_at: new Date("2024-01-01T00:00:00.000Z"),
      available_at: new Date("2024-01-01T00:00:00.000Z"),
      timeout: null,
      result: null,
      errors: null,
      attempted_at: new Date("2024-01-01T01:00:00.000Z"),
      completed_at: null,
      failed_at: new Date("2024-01-01T01:30:00.000Z"),
      canceled_at: null,
      claimed_at: new Date("2024-01-01T01:00:00.000Z"),
      claimed_by: "worker-5",
      unique_digest: null,
      uniqueness_config: null,
    };

    const transition = new RerunTransition();
    const updatedJob = transition.apply(job);

    expect(updatedJob.state).toBe("waiting");
    expect(updatedJob.available_at).toBeInstanceOf(Date);
    expect(updatedJob.max_attempts).toBe(6); // Should increase to attempt + 1
  });

  it("should preserve core job properties when rerunning", () => {
    const job: JobData = {
      id: 123,
      queue: "email",
      state: "completed",
      class: "EmailJob",
      script: "file:///email.js",
      args: ["test@example.com", "subject"],
      constructor_args: ["config"],
      attempt: 1,
      max_attempts: 5,
      inserted_at: new Date("2024-01-01T00:00:00.000Z"),
      available_at: new Date("2024-01-01T00:00:00.000Z"),
      timeout: 30000,
      result: "email sent",
      errors: null,
      attempted_at: new Date("2024-01-01T01:00:00.000Z"),
      completed_at: new Date("2024-01-01T01:30:00.000Z"),
      failed_at: null,
      canceled_at: null,
      claimed_at: new Date("2024-01-01T01:00:00.000Z"),
      claimed_by: "worker-1",
      unique_digest: "abc123",
      uniqueness_config: { type: "alive" },
    };

    const transition = new RerunTransition();
    const updatedJob = transition.apply(job);

    // Should change state and available_at
    expect(updatedJob.state).toBe("waiting");
    expect(updatedJob.available_at).toBeInstanceOf(Date);

    // Should preserve core properties
    expect(updatedJob.id).toBe(123);
    expect(updatedJob.queue).toBe("email");
    expect(updatedJob.class).toBe("EmailJob");
    expect(updatedJob.script).toBe("file:///email.js");
    expect(updatedJob.args).toEqual(["test@example.com", "subject"]);
    expect(updatedJob.constructor_args).toEqual(["config"]);
    expect(updatedJob.attempt).toBe(1);
    expect(updatedJob.max_attempts).toBe(5);
    expect(updatedJob.timeout).toBe(30000);
    expect(updatedJob.unique_digest).toBe("abc123");
    expect(updatedJob.uniqueness_config).toEqual({ type: "alive" });
    expect(updatedJob.inserted_at).toEqual(new Date("2024-01-01T00:00:00.000Z"));

    // Should preserve execution history
    expect(updatedJob.result).toBe("email sent");
    expect(updatedJob.attempted_at).toEqual(new Date("2024-01-01T01:00:00.000Z"));
    expect(updatedJob.completed_at).toEqual(new Date("2024-01-01T01:30:00.000Z"));
    expect(updatedJob.claimed_at).toEqual(new Date("2024-01-01T01:00:00.000Z"));
    expect(updatedJob.claimed_by).toBe("worker-1");
  });
});
