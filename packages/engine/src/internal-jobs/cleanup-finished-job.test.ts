import { unlink } from "fs";
import { Engine, SidequestConfig } from "../engine";
import { CleanupFinishedJobs } from "./cleanup-finished-job";

describe("cleanup-finished-job.ts", () => {
  const dbLocation = "./sidequest-test-cleanup.sqlite";
  const config: SidequestConfig = {
    backend: { driver: "@sidequest/sqlite-backend", config: dbLocation },
  };

  beforeEach(async () => {
    await Engine.configure(config);
  });

  afterEach(async () => {
    await Engine.close();
    unlink(dbLocation, () => {
      // noop
    });
  });

  describe("CleanupFinishedJobs", () => {
    it("deletes old finished jobs", async () => {
      const oneMonthAgo = new Date();
      oneMonthAgo.setDate(oneMonthAgo.getDate() - 32);

      const backend = Engine.getBackend()!;
      await backend.insertJob({
        state: "completed",
        queue: "default",
        script: "script.js",
        class: "DummyJob",
        args: [],
        constructor_args: [],
        attempt: 1,
        max_attempts: 5,
        completed_at: oneMonthAgo,
      });

      await backend.insertJob({
        state: "failed",
        queue: "default",
        script: "script.js",
        class: "DummyJob",
        args: [],
        constructor_args: [],
        attempt: 5,
        max_attempts: 5,
        failed_at: oneMonthAgo,
      });

      await backend.insertJob({
        state: "canceled",
        queue: "default",
        script: "script.js",
        class: "DummyJob",
        args: [],
        constructor_args: [],
        attempt: 0,
        max_attempts: 5,
        cancelled_at: oneMonthAgo,
      });

      const job = new CleanupFinishedJobs();
      await job.run();

      const jobs = await backend.listJobs({ state: ["canceled", "failed", "completed"] });

      expect(jobs).toHaveLength(0);
    });
  });
});
