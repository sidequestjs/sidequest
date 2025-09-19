import { NewJobData } from "@sidequest/backend";
import { describe, it } from "vitest";
import { backend } from "./backend";

export default function defineCreateNewJobTestSuite() {
  describe("createNewJob", () => {
    it("should insert new job with bare minimum", async () => {
      // Insert a waiting job
      const job: NewJobData = {
        queue: "default",
        class: "TestJob",
        args: [],
        constructor_args: [],
        state: "waiting",
        script: "test.js",
        attempt: 0,
      };

      const insertedJob = await backend.createNewJob(job);

      expect(insertedJob.queue).toBe("default");
      expect(insertedJob.class).toBe("TestJob");
      expect(insertedJob.args).toMatchObject([]);
      expect(insertedJob.constructor_args).toMatchObject([]);
      expect(insertedJob.state).toBe("waiting");
      expect(insertedJob.available_at).toEqual(expect.any(Date));
      expect(insertedJob.inserted_at).toEqual(expect.any(Date));
      expect(insertedJob.script).toBe("test.js");
      expect(insertedJob.attempt).toBe(0);
      expect(insertedJob.max_attempts).toBe(5);
      expect(insertedJob.result).toBe(null);
      expect(insertedJob.errors).toBe(null);
      expect(insertedJob.attempted_at).toBe(null);
      expect(insertedJob.completed_at).toBe(null);
      expect(insertedJob.failed_at).toBe(null);
      expect(insertedJob.canceled_at).toBe(null);
      expect(insertedJob.claimed_at).toBe(null);
      expect(insertedJob.claimed_by).toBe(null);
      expect(insertedJob.timeout).toBe(null);
      expect(insertedJob.unique_digest).toBe(null);
      expect(insertedJob.uniqueness_config).toBe(null);
      expect(insertedJob.retry_delay).toBe(null);
      expect(insertedJob.backoff_strategy).toBe("exponential");
    });

    it("should insert a new job with all optionals", async () => {
      const twelve = new Date();
      twelve.setUTCDate(12);
      twelve.setUTCMonth(12);
      twelve.setUTCFullYear(2012);
      // Insert a waiting job
      const job: NewJobData = {
        queue: "default",
        class: "TestJob",
        args: [{ foo: "bar" }],
        constructor_args: [{}],
        state: "waiting",
        script: "test.js",
        attempt: 0,
        max_attempts: 5,
        timeout: 10,
        available_at: twelve,
        unique_digest: "test",
        uniqueness_config: {
          type: "alive",
        },
        backoff_strategy: "fixed",
        retry_delay: 15,
      };

      const insertedJob = await backend.createNewJob(job);

      expect(insertedJob.queue).toBe("default");
      expect(insertedJob.class).toBe("TestJob");
      expect(insertedJob.args).toMatchObject([{ foo: "bar" }]);
      expect(insertedJob.constructor_args).toMatchObject([{}]);
      expect(insertedJob.state).toBe("waiting");
      expect(insertedJob.available_at).toEqual(twelve);
      expect(insertedJob.inserted_at).toEqual(expect.any(Date));
      expect(insertedJob.script).toBe("test.js");
      expect(insertedJob.attempt).toBe(0);
      expect(insertedJob.max_attempts).toBe(5);
      expect(insertedJob.result).toBe(null);
      expect(insertedJob.errors).toBe(null);
      expect(insertedJob.attempted_at).toBe(null);
      expect(insertedJob.completed_at).toBe(null);
      expect(insertedJob.failed_at).toBe(null);
      expect(insertedJob.canceled_at).toBe(null);
      expect(insertedJob.claimed_at).toBe(null);
      expect(insertedJob.claimed_by).toBe(null);
      expect(insertedJob.timeout).toBe(10);
      expect(insertedJob.unique_digest).toBe("test");
      expect(insertedJob.uniqueness_config).toMatchObject({ type: "alive" });
      expect(insertedJob.retry_delay).toBe(15);
      expect(insertedJob.backoff_strategy).toBe("fixed");
    });

    it("should not insert two jobs with the same unique digest", async () => {
      // Insert a waiting job
      const job: NewJobData = {
        queue: "default",
        class: "TestJob",
        args: [{ foo: "bar" }],
        constructor_args: [{}],
        state: "waiting",
        script: "test.js",
        attempt: 0,
        max_attempts: 5,
        timeout: 10,
        unique_digest: "test",
      };

      const job2: NewJobData = {
        queue: "default2",
        class: "TestJob2",
        args: [{ foo: "bar2" }],
        constructor_args: [{}],
        state: "waiting",
        script: "test2.js",
        attempt: 0,
        max_attempts: 5,
        timeout: 10,
        unique_digest: "test",
      };

      await backend.createNewJob(job);
      await expect(backend.createNewJob(job2)).rejects.toThrow();
    });
  });
}
