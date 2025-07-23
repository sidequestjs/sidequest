import { JobData } from "../schema";
import { CancelTransition } from "./cancel-transition";

describe("CancelTransition", () => {
  it("should cancel a job", () => {
    const job: JobData = {
      id: 1,
      queue: "default",
      state: "waiting",
      class: "TestJob",
      script: "file:///test.js",
      args: [],
      constructor_args: [],
      attempt: 0,
      max_attempts: 3,
      inserted_at: new Date("2024-01-01T00:00:00.000Z"),
      available_at: new Date("2024-01-01T00:00:00.000Z"),
      timeout: null,
      result: null,
      errors: null,
      attempted_at: null,
      completed_at: null,
      failed_at: null,
      canceled_at: null,
      claimed_at: null,
      claimed_by: null,
      unique_digest: null,
      uniqueness_config: null,
    };

    const transition = new CancelTransition();
    const updatedJob = transition.apply(job);

    expect(updatedJob.state).toBe("canceled");
    expect(updatedJob.canceled_at).toBeInstanceOf(Date);
    expect(updatedJob.canceled_at).not.toBeNull();
  });

  it("should preserve other job properties when canceling", () => {
    const job: JobData = {
      id: 123,
      queue: "email",
      state: "running",
      class: "EmailJob",
      script: "file:///email.js",
      args: ["test@example.com"],
      constructor_args: [],
      attempt: 2,
      max_attempts: 5,
      inserted_at: new Date("2024-01-01T00:00:00.000Z"),
      available_at: new Date("2024-01-01T00:00:00.000Z"),
      timeout: 30000,
      result: null,
      errors: null,
      attempted_at: new Date("2024-01-01T01:00:00.000Z"),
      completed_at: null,
      failed_at: null,
      canceled_at: null,
      claimed_at: new Date("2024-01-01T01:00:00.000Z"),
      claimed_by: "worker-1",
      unique_digest: "abc123",
      uniqueness_config: null,
    };

    const transition = new CancelTransition();
    const updatedJob = transition.apply(job);

    // Should change state and canceled_at
    expect(updatedJob.state).toBe("canceled");
    expect(updatedJob.canceled_at).toBeInstanceOf(Date);

    // Should preserve all other properties
    expect(updatedJob.id).toBe(123);
    expect(updatedJob.queue).toBe("email");
    expect(updatedJob.class).toBe("EmailJob");
    expect(updatedJob.script).toBe("file:///email.js");
    expect(updatedJob.args).toEqual(["test@example.com"]);
    expect(updatedJob.attempt).toBe(2);
    expect(updatedJob.max_attempts).toBe(5);
    expect(updatedJob.timeout).toBe(30000);
    expect(updatedJob.claimed_by).toBe("worker-1");
    expect(updatedJob.unique_digest).toBe("abc123");
  });
});
