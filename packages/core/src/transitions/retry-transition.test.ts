import { JobData } from "../schema";
import { RetryTransition } from "./retry-transition";

describe("RetryTransition", () => {
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

  it("allows retry setting a message", () => {
    const result = new RetryTransition("custom failed message").apply(jobData);
    const now = new Date();
    expect(result).toEqual({
      queue: "default",
      script: "./dummy-script.js",
      class: "DummyClass",
      args: [],
      constructor_args: [],
      attempt: 1,
      claimed_by: "node@worker",
      attempted_at: jobData.attempted_at,
      max_attempts: 10,
      state: "waiting",
      available_at: expect.any(Date) as Date,
      errors: [
        {
          attempt: 1,
          attempt_by: "node@worker",
          attempted_at: jobData.attempted_at,
          message: "custom failed message",
        },
      ],
    });
    expect(result.available_at?.getTime()).toBeGreaterThan(now.getTime());
  });

  it("allows retry setting a error", () => {
    const result = new RetryTransition(new Error("custom error")).apply(jobData);
    const now = new Date();
    expect(result).toEqual({
      queue: "default",
      script: "./dummy-script.js",
      class: "DummyClass",
      args: [],
      constructor_args: [],
      attempt: 1,
      claimed_by: "node@worker",
      attempted_at: jobData.attempted_at,
      max_attempts: 10,
      state: "waiting",
      available_at: expect.any(Date) as Date,
      errors: [
        {
          attempt: 1,
          attempt_by: "node@worker",
          attempted_at: jobData.attempted_at,
          message: "custom error",
          name: "Error",
          stack: expect.any(String) as string,
          level: expect.any(String) as string,
          timestamp: expect.any(String) as string,
        },
      ],
    });
    expect(result.available_at?.getTime()).toBeGreaterThan(now.getTime());
  });

  it("allows retry setting delay", () => {
    const result = new RetryTransition(new Error("custom error"), 3600000).apply(jobData);
    const inAlmostOneHour = new Date();
    inAlmostOneHour.setTime(inAlmostOneHour.getTime() - 3600000 - 300);
    expect(result).toEqual({
      queue: "default",
      script: "./dummy-script.js",
      class: "DummyClass",
      args: [],
      constructor_args: [],
      attempt: 1,
      claimed_by: "node@worker",
      attempted_at: jobData.attempted_at,
      max_attempts: 10,
      state: "waiting",
      available_at: expect.any(Date) as Date,
      errors: [
        {
          attempt: 1,
          attempt_by: "node@worker",
          attempted_at: jobData.attempted_at,
          message: "custom error",
          name: "Error",
          stack: expect.any(String) as string,
          level: expect.any(String) as string,
          timestamp: expect.any(String) as string,
        },
      ],
    });
    expect(result.available_at?.getTime()).toBeGreaterThanOrEqual(inAlmostOneHour.getTime());
  });

  it("marks job as failed when max attempts reached", () => {
    jobData.attempt = 10;
    const result = new RetryTransition("max attempts reached").apply(jobData);

    expect(result).toEqual({
      queue: "default",
      script: "./dummy-script.js",
      class: "DummyClass",
      args: [],
      constructor_args: [],
      attempt: 10,
      claimed_by: "node@worker",
      attempted_at: jobData.attempted_at,
      max_attempts: 10,
      state: "failed",
      failed_at: expect.any(Date) as Date,
      errors: [
        {
          attempt: 10,
          attempt_by: "node@worker",
          attempted_at: jobData.attempted_at,
          message: "max attempts reached",
        },
      ],
    });

    expect(result.failed_at?.getTime()).toBeLessThanOrEqual(Date.now());
  });
});
