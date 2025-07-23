import { JobData } from "../schema";
import { FailTransition } from "./fail-transition";

describe("FailTransition", () => {
  let jobData: JobData;
  beforeEach(() => {
    jobData = {
      queue: "default",
      script: "./dummy-script.js",
      class: "DummyClass",
      state: "running",
      args: [],
      constructor_args: [],
      attempt: 1,
      max_attempts: 10,
      claimed_by: "node@worker",
      attempted_at: new Date(),
    } as unknown as JobData;
  });

  it("sets job data as faild setting a message", () => {
    expect(new FailTransition("custom failed message").apply(jobData)).toEqual({
      queue: "default",
      script: "./dummy-script.js",
      class: "DummyClass",
      args: [],
      constructor_args: [],
      attempt: 1,
      claimed_by: "node@worker",
      attempted_at: jobData.attempted_at,
      max_attempts: 10,
      failed_at: expect.any(Date) as Date,
      state: "failed",
      errors: [
        {
          attempt: 1,
          attempt_by: "node@worker",
          attempted_at: jobData.attempted_at,
          message: "custom failed message",
        },
      ],
    });
  });

  it("sets job data as faild setting a error", () => {
    expect(new FailTransition(new Error("custom error")).apply(jobData)).toEqual({
      queue: "default",
      script: "./dummy-script.js",
      class: "DummyClass",
      args: [],
      constructor_args: [],
      attempt: 1,
      claimed_by: "node@worker",
      attempted_at: jobData.attempted_at,
      max_attempts: 10,
      failed_at: expect.any(Date) as Date,
      state: "failed",
      errors: [
        {
          attempt: 1,
          attempt_by: "node@worker",
          attempted_at: jobData.attempted_at,
          message: "custom error",
          name: "Error",
          stack: expect.any(String) as string,
          level: expect.any(String) as string,
          pid: expect.any(Number) as number,
          timestamp: expect.any(String) as string,
        },
      ],
    });
  });
});
