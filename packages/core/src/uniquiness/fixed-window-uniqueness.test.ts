import crypto from "crypto";
import { describe, expect, it } from "vitest";
import { JobData } from "../schema";
import { FixedWindowConfig, FixedWindowUniqueness } from "./fixed-window-uniqueness";

describe("FixedWindowUniqueness", () => {
  const createJobData = (overrides: Partial<JobData> = {}): JobData =>
    ({
      class: "TestJob",
      state: "waiting",
      queue: "default",
      script: "test-script.js",
      attempt: 1,
      max_attempts: 3,
      args: [],
      constructor_args: [],
      ...overrides,
    }) as unknown as JobData;

  describe("constructor", () => {
    it("should store config correctly", () => {
      const config: FixedWindowConfig = { type: "fixed-window", period: "hour", withArgs: true };
      const uniqueness = new FixedWindowUniqueness(config);

      expect(uniqueness.config).toBe(config);
    });
  });

  describe("digest", () => {
    it("should use current date when available_at is not provided", () => {
      const config: FixedWindowConfig = { type: "fixed-window", period: "hour", withArgs: false };
      const uniqueness = new FixedWindowUniqueness(config);
      const jobData = createJobData({ class: "TestJob" });

      const result = uniqueness.digest(jobData);

      expect(result).toBeTruthy();
      expect(typeof result).toBe("string");
      expect(result).toHaveLength(64);
    });

    it("should use provided available_at date", () => {
      const config: FixedWindowConfig = { type: "fixed-window", period: "hour", withArgs: false };
      const uniqueness = new FixedWindowUniqueness(config);
      const availableAt = new Date("2023-01-15T14:30:45.123Z");
      const jobData = createJobData({
        class: "TestJob",
        available_at: availableAt,
      });

      const result = uniqueness.digest(jobData);

      // Expected truncated time for hour period: 2023-01-15T14:00:00.000Z
      const truncatedTime = new Date(Date.UTC(2023, 0, 15, 14));
      const expectedKey = `TestJob::time=${truncatedTime.toISOString()}`;
      const expectedHash = crypto.createHash("sha256").update(expectedKey).digest("hex");

      expect(result).toBe(expectedHash);
    });

    it("should include args and constructor_args when withArgs is true", () => {
      const config: FixedWindowConfig = { type: "fixed-window", period: "hour", withArgs: true };
      const uniqueness = new FixedWindowUniqueness(config);
      const availableAt = new Date("2023-01-15T14:30:45.123Z");
      const jobData = createJobData({
        class: "TestJob",
        available_at: availableAt,
        args: [1, "test"],
        constructor_args: ["param1", "param2"],
      });

      const result = uniqueness.digest(jobData);

      const truncatedTime = new Date(Date.UTC(2023, 0, 15, 14));
      const expectedKey = `TestJob::time=${truncatedTime.toISOString()}::args=[1,"test"]::ctor=["param1","param2"]`;
      const expectedHash = crypto.createHash("sha256").update(expectedKey).digest("hex");

      expect(result).toBe(expectedHash);
    });

    it("should not include args when withArgs is false", () => {
      const config: FixedWindowConfig = { type: "fixed-window", period: "hour", withArgs: false };
      const uniqueness = new FixedWindowUniqueness(config);
      const availableAt = new Date("2023-01-15T14:30:45.123Z");
      const jobData = createJobData({
        class: "TestJob",
        available_at: availableAt,
        args: [1, "test"],
        constructor_args: ["param1"],
      });

      const result = uniqueness.digest(jobData);

      const truncatedTime = new Date(Date.UTC(2023, 0, 15, 14));
      const expectedKey = `TestJob::time=${truncatedTime.toISOString()}`;
      const expectedHash = crypto.createHash("sha256").update(expectedKey).digest("hex");

      expect(result).toBe(expectedHash);
    });

    it("should produce same hash for jobs in same time window", () => {
      const config: FixedWindowConfig = { type: "fixed-window", period: "hour", withArgs: false };
      const uniqueness = new FixedWindowUniqueness(config);

      const jobData1 = createJobData({
        class: "TestJob",
        available_at: new Date("2023-01-15T14:15:30.123Z"),
      });

      const jobData2 = createJobData({
        class: "TestJob",
        available_at: new Date("2023-01-15T14:45:10.456Z"),
      });

      const hash1 = uniqueness.digest(jobData1);
      const hash2 = uniqueness.digest(jobData2);

      expect(hash1).toBe(hash2);
    });

    it("should produce different hashes for jobs in different time windows", () => {
      const config: FixedWindowConfig = { type: "fixed-window", period: "hour", withArgs: false };
      const uniqueness = new FixedWindowUniqueness(config);

      const jobData1 = createJobData({
        class: "TestJob",
        available_at: new Date("2023-01-15T14:30:00.000Z"),
      });

      const jobData2 = createJobData({
        class: "TestJob",
        available_at: new Date("2023-01-15T15:30:00.000Z"),
      });

      const hash1 = uniqueness.digest(jobData1);
      const hash2 = uniqueness.digest(jobData2);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe("edge cases", () => {
    it("should handle complex nested args with stable stringification", () => {
      const config: FixedWindowConfig = { type: "fixed-window", period: "hour", withArgs: true };
      const uniqueness = new FixedWindowUniqueness(config);

      const complexArgs = { b: 2, a: 1, nested: { z: 26, a: 1 } };
      const jobData = createJobData({
        class: "TestJob",
        available_at: new Date("2023-01-15T14:30:45.123Z"),
        args: [complexArgs],
      });

      const result = uniqueness.digest(jobData);

      expect(result).toBeTruthy();
      expect(typeof result).toBe("string");
      expect(result).toHaveLength(64);
    });

    it("should produce consistent hashes regardless of object key order", () => {
      const config: FixedWindowConfig = { type: "fixed-window", period: "hour", withArgs: true };
      const uniqueness = new FixedWindowUniqueness(config);

      const availableAt = new Date("2023-01-15T14:30:45.123Z");
      const jobData1 = createJobData({
        class: "TestJob",
        available_at: availableAt,
        args: [{ b: 2, a: 1 }],
      });

      const jobData2 = createJobData({
        class: "TestJob",
        available_at: availableAt,
        args: [{ a: 1, b: 2 }],
      });

      const hash1 = uniqueness.digest(jobData1);
      const hash2 = uniqueness.digest(jobData2);

      expect(hash1).toBe(hash2);
    });
  });
});
