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

    it("should list jobs with LIKE pattern matching for queue", async () => {
      // Insert jobs with different queue names
      const job1: NewJobData = {
        queue: "email-queue",
        class: "EmailJob",
        args: [],
        constructor_args: [],
        state: "waiting",
        script: "email.js",
        attempt: 0,
      };

      const job2: NewJobData = {
        queue: "report-queue",
        class: "ReportJob",
        args: [],
        constructor_args: [],
        state: "waiting",
        script: "report.js",
        attempt: 0,
      };

      const job3: NewJobData = {
        queue: "notification",
        class: "NotificationJob",
        args: [],
        constructor_args: [],
        state: "waiting",
        script: "notification.js",
        attempt: 0,
      };

      await backend.createNewJob(job1);
      await backend.createNewJob(job2);
      await backend.createNewJob(job3);

      // Test wildcard matching - should match both email-queue and report-queue
      let listJobs = await backend.listJobs({ queue: "%-queue" });
      expect(listJobs).toHaveLength(2);
      expect(listJobs.every((job) => job.queue.endsWith("-queue"))).toBe(true);

      // Test prefix matching - should match all queues starting with "email"
      listJobs = await backend.listJobs({ queue: "email%" });
      expect(listJobs).toHaveLength(1);
      expect(listJobs[0].queue).toBe("email-queue");

      // Test contains matching - should match notification
      listJobs = await backend.listJobs({ queue: "%notification%" });
      expect(listJobs).toHaveLength(1);
      expect(listJobs[0].queue).toBe("notification");
    });

    it("should list jobs with LIKE pattern matching for jobClass", async () => {
      // Insert jobs with different class names
      const job1: NewJobData = {
        queue: "default",
        class: "SendEmailJob",
        args: [],
        constructor_args: [],
        state: "waiting",
        script: "email.js",
        attempt: 0,
      };

      const job2: NewJobData = {
        queue: "default",
        class: "ProcessEmailJob",
        args: [],
        constructor_args: [],
        state: "waiting",
        script: "email.js",
        attempt: 0,
      };

      const job3: NewJobData = {
        queue: "default",
        class: "DataProcessor",
        args: [],
        constructor_args: [],
        state: "waiting",
        script: "processor.js",
        attempt: 0,
      };

      await backend.createNewJob(job1);
      await backend.createNewJob(job2);
      await backend.createNewJob(job3);

      // Test wildcard matching - should match both email jobs
      let listJobs = await backend.listJobs({ jobClass: "%EmailJob" });
      expect(listJobs).toHaveLength(2);
      expect(listJobs.every((job) => job.class.endsWith("EmailJob"))).toBe(true);

      // Test prefix matching - should match jobs starting with "Send"
      listJobs = await backend.listJobs({ jobClass: "Send%" });
      expect(listJobs).toHaveLength(1);
      expect(listJobs[0].class).toBe("SendEmailJob");

      // Test contains matching - should match DataProcessor
      listJobs = await backend.listJobs({ jobClass: "%taProc%" });
      expect(listJobs).toHaveLength(1);
      expect(listJobs[0].class).toBe("DataProcessor");
    });

    it("should list jobs with LIKE pattern matching for state", async () => {
      // Insert jobs with different states
      const job1 = {
        queue: "default",
        class: "TestJob",
        args: [],
        constructor_args: [],
        state: "waiting" as const,
        script: "test.js",
        attempt: 0 as const,
      };

      const job2 = {
        queue: "default",
        class: "TestJob",

        args: [],
        constructor_args: [],
        state: "waiting" as const,
        script: "test.js",
        attempt: 0 as const,
      };

      const job3 = {
        queue: "default",
        class: "TestJob",
        args: [],
        constructor_args: [],
        state: "waiting" as const,
        script: "test.js",
        attempt: 0 as const,
      };

      await backend.createNewJob(job1);
      const newJob2 = await backend.createNewJob(job2);
      const newJob3 = await backend.createNewJob(job3);
      await backend.updateJob({ ...newJob2, state: "running", attempted_at: new Date() });
      await backend.updateJob({ ...newJob3, state: "completed", attempted_at: new Date(2000, 0, 1) });

      // Test prefix matching - should match states starting with "wait"
      let listJobs = await backend.listJobs({ state: "wait%" });
      expect(listJobs).toHaveLength(1);
      expect(listJobs[0].state).toBe("waiting");

      // Test suffix matching - should match states ending with "ing"
      listJobs = await backend.listJobs({ state: "%ing" });
      expect(listJobs).toHaveLength(2);
      expect(listJobs.every((job) => job.state.endsWith("ing"))).toBe(true);

      // Test contains matching - should match "completed"
      listJobs = await backend.listJobs({ state: "%complet%" });
      expect(listJobs).toHaveLength(1);
      expect(listJobs[0].state).toBe("completed");
    });
  });
}
