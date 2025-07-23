import { NewJobData } from "@sidequest/backend";
import { describe, it } from "vitest";
import { backend } from "./backend";

export default function defineListJobsTestSuite() {
  describe("listJobs", () => {
    it("should list all jobs", async () => {
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

      await backend.createNewJob(job);
      await backend.createNewJob(job);

      const listJobs = await backend.listJobs();
      expect(listJobs).toHaveLength(2);
    });

    it("should list no job", async () => {
      // Insert a waiting job
      const job: NewJobData = {
        queue: "default",
        class: "TestJob",
        args: ["test"],
        constructor_args: [],
        state: "waiting",
        script: "test.js",
        attempt: 0,
      };

      const insertedJob = await backend.createNewJob(job);
      await backend.updateJob({ ...insertedJob, attempted_at: new Date() });

      let listJobs = await backend.listJobs({ queue: "non_existing" });
      expect(listJobs).toHaveLength(0);

      listJobs = await backend.listJobs({ jobClass: "non_existing" });
      expect(listJobs).toHaveLength(0);

      listJobs = await backend.listJobs({ state: "canceled" });
      expect(listJobs).toHaveLength(0);

      listJobs = await backend.listJobs({ args: ["non_existing"] });
      expect(listJobs).toHaveLength(0);

      listJobs = await backend.listJobs({ offset: 20 });
      expect(listJobs).toHaveLength(0);

      listJobs = await backend.listJobs({ timeRange: { from: new Date() } });
      expect(listJobs).toHaveLength(0);

      listJobs = await backend.listJobs({ timeRange: { to: new Date(2000, 0, 1) } });
      expect(listJobs).toHaveLength(0);
    });

    it("should list no job with and", async () => {
      // Insert a waiting job
      const job: NewJobData = {
        queue: "default",
        class: "TestJob",
        args: ["test"],
        constructor_args: [],
        state: "waiting",
        script: "test.js",
        attempt: 0,
      };

      const insertedJob = await backend.createNewJob(job);
      await backend.updateJob({ ...insertedJob, attempted_at: new Date() });

      let listJobs = await backend.listJobs({ queue: "default", jobClass: "non_existing" });
      expect(listJobs).toHaveLength(0);

      listJobs = await backend.listJobs({ jobClass: "TestJob", queue: "non_existing" });
      expect(listJobs).toHaveLength(0);

      listJobs = await backend.listJobs({ state: "waiting", args: ["non_existing"] });
      expect(listJobs).toHaveLength(0);

      listJobs = await backend.listJobs({ args: ["test"], state: "canceled" });
      expect(listJobs).toHaveLength(0);

      listJobs = await backend.listJobs({ offset: 0, state: "canceled" });
      expect(listJobs).toHaveLength(0);

      listJobs = await backend.listJobs({ timeRange: { to: new Date(), from: new Date() } });
      expect(listJobs).toHaveLength(0);
    });

    it("should list single job", async () => {
      // Insert a waiting job
      const job: NewJobData = {
        queue: "default",
        class: "TestJob",
        args: ["test"],
        constructor_args: [],
        state: "waiting",
        script: "test.js",
        attempt: 0,
      };

      const job2: NewJobData = {
        queue: "default2",
        class: "TestJob2",
        args: ["test2"],
        constructor_args: [],
        state: "waiting",
        script: "test2.js",
        attempt: 0,
      };

      let insertedJob = await backend.createNewJob(job);
      let insertedJob2 = await backend.createNewJob(job2);

      insertedJob = await backend.updateJob({ ...insertedJob, attempted_at: new Date() });
      insertedJob2 = await backend.updateJob({
        ...insertedJob2,
        attempted_at: new Date(2000, 0, 1),
        state: "canceled",
      });

      let listJobs = await backend.listJobs({ queue: "default" });
      expect(listJobs).toHaveLength(1);
      expect(listJobs[0]).toMatchObject(insertedJob);

      listJobs = await backend.listJobs({ jobClass: "TestJob" });
      expect(listJobs).toHaveLength(1);
      expect(listJobs[0]).toMatchObject(insertedJob);

      listJobs = await backend.listJobs({ state: "waiting" });
      expect(listJobs).toHaveLength(1);
      expect(listJobs[0]).toMatchObject(insertedJob);

      listJobs = await backend.listJobs({ args: ["test"] });
      expect(listJobs).toHaveLength(1);
      expect(listJobs[0]).toMatchObject(insertedJob);

      listJobs = await backend.listJobs({ offset: 0, limit: 1 });
      expect(listJobs).toHaveLength(1);
      expect(listJobs[0]).toMatchObject(insertedJob2);
    });

    it("should list both jobs with In", async () => {
      // Insert a waiting job
      const job: NewJobData = {
        queue: "default",
        class: "TestJob",
        args: ["test"],
        constructor_args: [],
        state: "waiting",
        script: "test.js",
        attempt: 0,
      };

      const job2: NewJobData = {
        queue: "default2",
        class: "TestJob2",
        args: ["test2"],
        constructor_args: [],
        state: "waiting",
        script: "test2.js",
        attempt: 0,
      };

      const insertedJob = await backend.createNewJob(job);
      const insertedJob2 = await backend.createNewJob(job2);

      await backend.updateJob({ ...insertedJob, attempted_at: new Date() });
      await backend.updateJob({ ...insertedJob2, attempted_at: new Date(2000, 0, 1), state: "canceled" });

      let listJobs = await backend.listJobs({ queue: ["default", "default2"] });
      expect(listJobs).toHaveLength(2);

      listJobs = await backend.listJobs({ jobClass: ["TestJob", "TestJob2"] });
      expect(listJobs).toHaveLength(2);

      listJobs = await backend.listJobs({ state: ["waiting", "canceled"] });
      expect(listJobs).toHaveLength(2);

      listJobs = await backend.listJobs({ offset: 0 });
      expect(listJobs).toHaveLength(2);
    });

    it("should list job if dates between range", async () => {
      // Insert a waiting job
      const job: NewJobData = {
        queue: "default",
        class: "TestJob",
        args: ["test"],
        constructor_args: [],
        state: "waiting",
        script: "test.js",
        attempt: 0,
      };

      const now = new Date();
      const insertedJob = await backend.createNewJob(job);

      await backend.updateJob({ ...insertedJob, attempted_at: now });

      let listJobs = await backend.listJobs({
        timeRange: {
          from: new Date(now.getTime()),
          to: new Date(now.getTime()),
        },
      });
      expect(listJobs).toHaveLength(1);

      listJobs = await backend.listJobs({
        timeRange: {
          from: new Date(now.getTime() - 1),
          to: new Date(now.getTime() + 1),
        },
      });
      expect(listJobs).toHaveLength(1);
    });

    it("should not list job if dates not between range", async () => {
      // Insert a waiting job
      const job: NewJobData = {
        queue: "default",
        class: "TestJob",
        args: ["test"],
        constructor_args: [],
        state: "waiting",
        script: "test.js",
        attempt: 0,
      };

      const now = new Date();
      const insertedJob = await backend.createNewJob(job);

      await backend.updateJob({ ...insertedJob, attempted_at: now });

      let listJobs = await backend.listJobs({
        timeRange: {
          from: new Date(now.getTime() + 1),
          to: new Date(now.getTime() + 10),
        },
      });
      expect(listJobs).toHaveLength(0);

      listJobs = await backend.listJobs({
        timeRange: {
          from: new Date(now.getTime() - 10),
          to: new Date(now.getTime() - 1),
        },
      });
      expect(listJobs).toHaveLength(0);
    });
  });
}
