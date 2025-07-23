import crypto from "crypto";
import { describe, expect, it } from "vitest";
import { JobData, JobState } from "../schema";
import { AliveJobConfig, AliveJobUniqueness } from "./alive-job-uniqueness";

describe("AliveJobUniqueness", () => {
  const createJobData = (overrides: Partial<JobData> = {}): JobData => ({
    class: "TestJob",
    state: "waiting",
    queue: "default",
    script: "test-script.js",
    attempt: 1,
    max_attempts: 3,
    args: [],
    constructor_args: [],
    ...overrides,
  });

  describe("constructor", () => {
    it("should store config correctly", () => {
      const config: AliveJobConfig = { type: "alive-job", withArgs: true };
      const uniqueness = new AliveJobUniqueness(config);

      expect(uniqueness.config).toBe(config);
    });
  });

  describe("digest", () => {
    describe("with alive states", () => {
      const aliveStates: JobState[] = ["waiting", "claimed", "running"];

      it.each(aliveStates)("should return hash digest for %s state", (state) => {
        const config: AliveJobConfig = { type: "alive-job", withArgs: false };
        const uniqueness = new AliveJobUniqueness(config);
        const jobData = createJobData({ state });

        const result = uniqueness.digest(jobData);

        expect(result).toBe(crypto.createHash("sha256").update("TestJob").digest("hex"));
        expect(typeof result).toBe("string");
        expect(result).toHaveLength(64); // SHA256 hex digest length
      });

      it("should include args and constructor_args when withArgs is true", () => {
        const config: AliveJobConfig = { type: "alive-job", withArgs: true };
        const uniqueness = new AliveJobUniqueness(config);
        const jobData = createJobData({
          state: "waiting",
          args: [1, "test"],
          constructor_args: ["param1", "param2"],
        });

        const result = uniqueness.digest(jobData);
        const expectedKey = 'TestJob::args=[1,"test"]::ctor=["param1","param2"]';
        const expectedHash = crypto.createHash("sha256").update(expectedKey).digest("hex");

        expect(result).toBe(expectedHash);
      });

      it("should not include args when withArgs is false", () => {
        const config: AliveJobConfig = { type: "alive-job", withArgs: false };
        const uniqueness = new AliveJobUniqueness(config);
        const jobData = createJobData({
          state: "waiting",
          args: [1, "test"],
          constructor_args: ["param1"],
        });

        const result = uniqueness.digest(jobData);
        const expectedHash = crypto.createHash("sha256").update("TestJob").digest("hex");

        expect(result).toBe(expectedHash);
      });

      it("should produce different hashes for different job classes", () => {
        const config: AliveJobConfig = { type: "alive-job", withArgs: false };
        const uniqueness = new AliveJobUniqueness(config);

        const jobData1 = createJobData({ class: "JobA", state: "waiting" });
        const jobData2 = createJobData({ class: "JobB", state: "waiting" });

        const hash1 = uniqueness.digest(jobData1);
        const hash2 = uniqueness.digest(jobData2);

        expect(hash1).not.toBe(hash2);
      });

      it("should produce different hashes for different args when withArgs is true", () => {
        const config: AliveJobConfig = { type: "alive-job", withArgs: true };
        const uniqueness = new AliveJobUniqueness(config);

        const jobData1 = createJobData({ state: "waiting", args: [1] });
        const jobData2 = createJobData({ state: "waiting", args: [2] });

        const hash1 = uniqueness.digest(jobData1);
        const hash2 = uniqueness.digest(jobData2);

        expect(hash1).not.toBe(hash2);
      });

      it("should produce same hash for same job data", () => {
        const config: AliveJobConfig = { type: "alive-job", withArgs: true };
        const uniqueness = new AliveJobUniqueness(config);

        const jobData = createJobData({
          state: "waiting",
          args: [1, "test"],
          constructor_args: ["param"],
        });

        const hash1 = uniqueness.digest(jobData);
        const hash2 = uniqueness.digest(jobData);

        expect(hash1).toBe(hash2);
      });
    });

    describe("with non-alive states", () => {
      const nonAliveStates: JobState[] = ["completed", "failed", "canceled"];

      it.each(nonAliveStates)("should return null for %s state", (state) => {
        const config: AliveJobConfig = { type: "alive-job", withArgs: true };
        const uniqueness = new AliveJobUniqueness(config);
        const jobData = createJobData({ state });

        const result = uniqueness.digest(jobData);

        expect(result).toBeNull();
      });
    });

    describe("edge cases", () => {
      it("should handle complex nested args with stable stringification", () => {
        const config: AliveJobConfig = { type: "alive-job", withArgs: true };
        const uniqueness = new AliveJobUniqueness(config);

        const complexArgs = { b: 2, a: 1, nested: { z: 26, a: 1 } };
        const jobData = createJobData({
          state: "waiting",
          args: [complexArgs],
        });

        const result = uniqueness.digest(jobData);

        expect(result).toBeTruthy();
        expect(typeof result).toBe("string");
        expect(result).toHaveLength(64);
      });

      it("should produce consistent hashes regardless of object key order", () => {
        const config: AliveJobConfig = { type: "alive-job", withArgs: true };
        const uniqueness = new AliveJobUniqueness(config);

        const jobData1 = createJobData({
          state: "waiting",
          args: [{ b: 2, a: 1 }],
        });

        const jobData2 = createJobData({
          state: "waiting",
          args: [{ a: 1, b: 2 }],
        });

        const hash1 = uniqueness.digest(jobData1);
        const hash2 = uniqueness.digest(jobData2);

        expect(hash1).toBe(hash2);
      });
    });
  });
});
