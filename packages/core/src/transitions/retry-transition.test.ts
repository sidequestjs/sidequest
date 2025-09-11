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
      retry_delay: null,
      backoff_strategy: "fixed",
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
      backoff_strategy: "fixed",
      retry_delay: null,
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
        },
      ],
      backoff_strategy: "fixed",
      retry_delay: null,
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
        },
      ],
      backoff_strategy: "fixed",
      retry_delay: null,
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
      backoff_strategy: "fixed",
      retry_delay: null,
    });

    expect(result.failed_at?.getTime()).toBeLessThanOrEqual(Date.now());
  });

  describe("backoff strategy and retry_delay", () => {
    beforeEach(() => {
      // Reset jobData for backoff tests
      jobData.attempt = 2; // Second attempt to see backoff effect
      jobData.retry_delay = null;
      jobData.backoff_strategy = "fixed";
    });

    it("uses default delay (1000ms) when no retry_delay and strategy is exponential", () => {
      jobData.retry_delay = null;
      jobData.backoff_strategy = "exponential";

      const result = new RetryTransition("test error").apply(jobData);

      expect(result.state).toBe("waiting");
      expect(result.available_at).toBeInstanceOf(Date);

      // For exponential backoff with attempt=2, baseDelay=1000:
      // Expected range: 1000 * 2^(2-1) * jitter = 2000 * (0.5 to 1.5) = 1000ms to 3000ms
      const delay = result.available_at.getTime() - Date.now();
      expect(delay).toBeGreaterThanOrEqual(900); // Allow some tolerance
      expect(delay).toBeLessThanOrEqual(3100); // Allow some tolerance
    });

    it("uses default delay (1000ms) when no retry_delay and strategy is fixed", () => {
      jobData.retry_delay = null;
      jobData.backoff_strategy = "fixed";

      const result = new RetryTransition("test error").apply(jobData);

      expect(result.state).toBe("waiting");
      expect(result.available_at).toBeInstanceOf(Date);

      // For fixed strategy, should use default 1000ms
      const delay = result.available_at.getTime() - Date.now();
      expect(delay).toBeGreaterThanOrEqual(900); // Allow some tolerance
      expect(delay).toBeLessThanOrEqual(1100); // Allow some tolerance
    });

    it("uses job retry_delay with exponential strategy", () => {
      jobData.retry_delay = 500;
      jobData.backoff_strategy = "exponential";

      const result = new RetryTransition("test error").apply(jobData);

      expect(result.state).toBe("waiting");
      expect(result.available_at).toBeInstanceOf(Date);

      // For exponential backoff with attempt=2, baseDelay=500:
      // Expected range: 500 * 2^(2-1) * jitter = 1000 * (0.5 to 1.5) = 500ms to 1500ms
      const delay = result.available_at.getTime() - Date.now();
      expect(delay).toBeGreaterThanOrEqual(450); // Allow some tolerance
      expect(delay).toBeLessThanOrEqual(1550); // Allow some tolerance
    });

    it("uses job retry_delay with fixed strategy", () => {
      jobData.retry_delay = 2000;
      jobData.backoff_strategy = "fixed";

      const result = new RetryTransition("test error").apply(jobData);

      expect(result.state).toBe("waiting");
      expect(result.available_at).toBeInstanceOf(Date);

      // For fixed strategy, should use exact retry_delay
      const delay = result.available_at.getTime() - Date.now();
      expect(delay).toBeGreaterThanOrEqual(1900); // Allow some tolerance
      expect(delay).toBeLessThanOrEqual(2100); // Allow some tolerance
    });

    it("prioritizes constructor delay over job retry_delay", () => {
      jobData.retry_delay = 2000;
      jobData.backoff_strategy = "fixed";

      const constructorDelay = 5000;
      const result = new RetryTransition("test error", constructorDelay).apply(jobData);

      expect(result.state).toBe("waiting");
      expect(result.available_at).toBeInstanceOf(Date);

      // Constructor delay should take priority over job retry_delay
      const delay = result.available_at.getTime() - Date.now();
      expect(delay).toBeGreaterThanOrEqual(4900); // Allow some tolerance
      expect(delay).toBeLessThanOrEqual(5100); // Allow some tolerance
    });

    it("applies exponential backoff correctly for higher attempts", () => {
      jobData.attempt = 4; // Fourth attempt
      jobData.retry_delay = 100;
      jobData.backoff_strategy = "exponential";

      const result = new RetryTransition("test error").apply(jobData);

      expect(result.state).toBe("waiting");
      expect(result.available_at).toBeInstanceOf(Date);

      // For exponential backoff with attempt=4, baseDelay=100:
      // Expected range: 100 * 2^(4-1) * jitter = 800 * (0.5 to 1.5) = 400ms to 1200ms
      const delay = result.available_at.getTime() - Date.now();
      expect(delay).toBeGreaterThanOrEqual(350); // Allow some tolerance
      expect(delay).toBeLessThanOrEqual(1250); // Allow some tolerance
    });

    it("respects maximum delay cap in exponential backoff", () => {
      jobData.max_attempts = 30;
      jobData.attempt = 20; // Very high attempt number
      jobData.retry_delay = 1000;
      jobData.backoff_strategy = "exponential";

      const result = new RetryTransition("test error").apply(jobData);

      expect(result.state).toBe("waiting");
      expect(result.available_at).toBeInstanceOf(Date);

      // Should be capped at maxDelay (3,600,000ms = 1 hour)
      const delay = result.available_at.getTime() - Date.now();
      expect(delay).toBeLessThanOrEqual(3600000); // Should not exceed 1 hour
    });
  });
});
