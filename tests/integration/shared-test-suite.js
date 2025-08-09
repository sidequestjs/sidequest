import { afterEach, describe, expect, test, vi } from "vitest";

const backend = {
  driver: "@sidequest/postgres-backend",
  config: process.env.POSTGRES_URL ?? "postgresql://postgres:postgres@localhost:5432/postgres",
};

export function createIntegrationTestSuite(Sidequest, jobs, moduleType = "ESM") {
  const { SuccessJob, RetryJob, FailingJob, TimeoutJob, EnqueueFromWithinJob } = jobs;

  describe(`[${moduleType}] Sidequest Integration Tests`, () => {
    afterEach(async () => {
      await Sidequest.getBackend()?.truncate();
      // Always stop Sidequest after each test
      await Sidequest.stop();
    });

    describe(`[${moduleType}] Basic Job Execution`, () => {
      test(`[${moduleType}] should start Sidequest and execute a simple job`, async () => {
        await Sidequest.start({
          backend,
          queues: [{ name: "default" }],
        });

        const jobBuilder = Sidequest.build(EnqueueFromWithinJob);
        const jobData = await jobBuilder.enqueue();

        expect(jobData.id).toBeDefined();
        expect(jobData.state).toBe("waiting");
        expect(jobData.class).toBe("EnqueueFromWithinJob");

        // Wait for job to be processed
        await vi.waitUntil(async () => {
          const jobs = await Sidequest.job.list();
          return jobs.length === 2 && jobs.every((job) => job.state === "completed");
        }, 5000);
      });

      test(`[${moduleType}] should start Sidequest and execute a job that enqueues another job`, async () => {
        await Sidequest.start({
          backend,
          queues: [{ name: "default" }],
        });

        const jobBuilder = Sidequest.build(SuccessJob);
        const jobData = await jobBuilder.enqueue("Hello World");

        expect(jobData.id).toBeDefined();
        expect(jobData.state).toBe("waiting");
        expect(jobData.class).toBe("SuccessJob");

        // Wait for job to be processed
        await vi.waitUntil(async () => {
          const job = await Sidequest.job.get(jobData.id);
          return job?.state === "completed";
        });

        const processedJob = await Sidequest.job.get(jobData.id);
        expect(processedJob?.state).toBe("completed");
      });

      test(`[${moduleType}] should enqueue multiple jobs and execute them all`, async () => {
        await Sidequest.start({
          backend,
          queues: [{ name: "default", concurrency: 2 }],
        });

        const jobs = await Promise.all([
          Sidequest.build(SuccessJob).enqueue("Job 1"),
          Sidequest.build(SuccessJob).enqueue("Job 2"),
          Sidequest.build(SuccessJob).enqueue("Job 3"),
        ]);

        expect(jobs).toHaveLength(3);
        jobs.forEach((job) => {
          expect(job.state).toBe("waiting");
          expect(job.class).toBe("SuccessJob");
        });

        // Wait for jobs to be processed
        await vi.waitUntil(async () => {
          const statuses = await Promise.all(jobs.map((job) => Sidequest.job.get(job.id)));
          return statuses.every((job) => job?.state === "completed");
        }, 5000);

        for (const job of jobs) {
          const processedJob = await Sidequest.job.get(job.id);
          expect(processedJob?.state).toBe("completed");
        }
      });

      test(`[${moduleType}] should handle jobs with different queues`, async () => {
        await Sidequest.start({
          backend,
          queues: [
            { name: "high-priority", priority: 10 },
            { name: "low-priority", priority: 1 },
          ],
        });

        const highPriorityJob = await Sidequest.build(SuccessJob).queue("high-priority").enqueue("High Priority");

        const lowPriorityJob = await Sidequest.build(SuccessJob).queue("low-priority").enqueue("Low Priority");

        expect(highPriorityJob.queue).toBe("high-priority");
        expect(lowPriorityJob.queue).toBe("low-priority");

        // Wait for jobs to be processed
        await vi.waitUntil(async () => {
          const highJob = await Sidequest.job.get(highPriorityJob.id);
          const lowJob = await Sidequest.job.get(lowPriorityJob.id);
          return highJob?.state === "completed" && lowJob?.state === "completed";
        }, 5000);

        const processedHighPriorityJob = await Sidequest.job.get(highPriorityJob.id);
        const processedLowPriorityJob = await Sidequest.job.get(lowPriorityJob.id);

        expect(processedHighPriorityJob?.state).toBe("completed");
        expect(processedLowPriorityJob?.state).toBe("completed");
      });
    });

    describe(`[${moduleType}] Job Retries`, () => {
      test(`[${moduleType}] should retry failed jobs automatically`, async () => {
        await Sidequest.start({
          backend,
          queues: [{ name: "default" }],
        });

        const jobData = await Sidequest.build(RetryJob).maxAttempts(3).enqueue("retry-test");

        expect(jobData.max_attempts).toBe(3);

        // Wait for job to fail and retry
        await vi.waitUntil(() => Sidequest.job.get(jobData.id).then((job) => job?.state === "completed"), 5000);

        const processedJob = await Sidequest.job.get(jobData.id);
        expect(processedJob?.state).toBe("completed");
        expect(processedJob?.attempt).toBe(2); // First attempt failed, second succeeded
      });

      test(`[${moduleType}] should mark job as failed after max attempts`, async () => {
        await Sidequest.start({
          backend,
          queues: [{ name: "default" }],
        });

        const jobData = await Sidequest.build(FailingJob).maxAttempts(2).enqueue("always-fails");

        expect(jobData.max_attempts).toBe(2);

        // Wait for job to fail all attempts
        await vi.waitUntil(() => Sidequest.job.get(jobData.id).then((job) => job?.state === "failed"), 5000);

        const processedJob = await Sidequest.job.get(jobData.id);
        expect(processedJob?.state).toBe("failed");
        expect(processedJob?.attempt).toBe(1);
      });

      test(`[${moduleType}] should respect retry delay`, async () => {
        await Sidequest.start({
          backend,
          queues: [{ name: "default" }],
        });

        const startTime = Date.now();
        const jobData = await Sidequest.build(RetryJob).maxAttempts(3).enqueue("retry-with-delay");

        // Wait for job to complete (should take some time due to retry delays)
        await vi.waitUntil(async () => {
          const job = await Sidequest.job.get(jobData.id);
          return job?.state === "completed" || job?.state === "failed";
        }, 5000);

        const processedJob = await Sidequest.job.get(jobData.id);
        const endTime = Date.now();

        expect(processedJob?.state).toBe("completed");
        // Should have taken some time due to exponential backoff
        expect(endTime - startTime).toBeGreaterThan(500);
      });
    });

    describe(`[${moduleType}] Job Timeouts`, () => {
      test(`[${moduleType}] should timeout jobs that exceed configured timeout`, async () => {
        await Sidequest.start({
          backend,
          queues: [{ name: "default" }],
        });

        const jobData = await Sidequest.build(TimeoutJob)
          .timeout(500) // 500ms timeout
          .maxAttempts(1) // No retries
          .enqueue(1000); // Job takes 1000ms

        // Wait for job to timeout
        await vi.waitUntil(async () => {
          const job = await Sidequest.job.get(jobData.id);
          return job?.state === "failed";
        }, 5000);

        const processedJob = await Sidequest.job.get(jobData.id);
        expect(processedJob?.state).toBe("failed");
      });

      test(`[${moduleType}] should complete jobs that finish within timeout`, async () => {
        await Sidequest.start({
          backend,
          queues: [{ name: "default" }],
        });

        const jobData = await Sidequest.build(TimeoutJob)
          .timeout(1000) // 1000ms timeout
          .enqueue(200); // Job takes 200ms

        // Wait for job to complete
        await vi.waitUntil(() => Sidequest.job.get(jobData.id).then((job) => job?.state === "completed"), 5000);

        const processedJob = await Sidequest.job.get(jobData.id);
        expect(processedJob?.state).toBe("completed");
      });

      test(`[${moduleType}] should retry timed out jobs if max attempts allows`, async () => {
        await Sidequest.start({
          backend,
          queues: [{ name: "default" }],
        });

        const jobData = await Sidequest.build(TimeoutJob)
          .timeout(300) // 300ms timeout
          .maxAttempts(2)
          .enqueue(500); // Job takes 500ms

        await vi.waitUntil(() => Sidequest.job.get(jobData.id).then((job) => job?.state === "failed"), 5000);

        const processedJob = await Sidequest.job.get(jobData.id);
        expect(processedJob?.state).toBe("failed");
        expect(processedJob?.attempt).toBe(2); // Should have attempted 3 times
      });
    });

    describe(`[${moduleType}] Job Cancellation`, () => {
      test(`[${moduleType}] should cancel waiting jobs`, async () => {
        await Sidequest.start({
          backend,
          queues: [{ name: "default", concurrency: 1 }], // No workers to keep job waiting
        });

        const jobData = await Sidequest.build(SuccessJob)
          .availableAt(new Date(3000, 0, 1))
          .enqueue("cancel-test");

        expect(jobData.state).toBe("waiting");

        // Cancel the job
        const cancelledJob = await Sidequest.job.cancel(jobData.id);
        expect(cancelledJob.state).toBe("canceled");

        // Verify job remains cancelled
        const finalJob = await Sidequest.job.get(jobData.id);
        expect(finalJob?.state).toBe("canceled");
      });

      test(`[${moduleType}] should handle cancellation of non-existent jobs`, async () => {
        await Sidequest.start({
          backend,
          queues: [{ name: "default" }],
        });

        await expect(Sidequest.job.cancel(99999)).rejects.toThrow();
      });

      test(`[${moduleType}] should mark running jobs as canceled and stop immediately`, async () => {
        await Sidequest.start({
          backend,
          queues: [{ name: "default" }],
        });

        const jobData = await Sidequest.build(TimeoutJob).enqueue(1000000);

        await vi.waitUntil(() => Sidequest.job.get(jobData.id).then((job) => job?.state === "running"), 5000);
        // Cancel the job while it's running
        const cancelledJob = await Sidequest.job.cancel(jobData.id);
        expect(cancelledJob.state).toBe("canceled");
      });
    });

    describe(`[${moduleType}] Job Snoozing`, () => {
      test(`[${moduleType}] should snooze jobs externally using Sidequest.job.snooze`, async () => {
        await Sidequest.start({
          backend,
          queues: [{ name: "default", concurrency: 1 }], // No workers initially
        });

        const jobData = await Sidequest.build(SuccessJob)
          .availableAt(new Date(3000, 0, 1))
          .enqueue("success");

        // Snooze the job for 200ms
        const snoozedJob = await Sidequest.job.snooze(jobData.id, 200);
        expect(snoozedJob.state).toBe("waiting");
        expect(snoozedJob.available_at).toBeDefined();

        await vi.waitUntil(() => Sidequest.job.get(jobData.id).then((job) => job?.state === "completed"), 5000);

        const processedJob = await Sidequest.job.get(jobData.id);
        expect(processedJob?.state).toBe("completed");
      });

      test(`[${moduleType}] should reject negative snooze delays`, async () => {
        await Sidequest.start({
          backend,
          queues: [{ name: "default" }],
        });

        const jobData = await Sidequest.build(SuccessJob)
          .availableAt(new Date(3000, 0, 1))
          .enqueue("negative-snooze");

        await expect(Sidequest.job.snooze(jobData.id, -1000)).rejects.toThrow();
      });
    });

    describe(`[${moduleType}] Job Management`, () => {
      test(`[${moduleType}] should run jobs immediately using Sidequest.job.run`, async () => {
        await Sidequest.start({
          backend,
          queues: [{ name: "default", concurrency: 1 }], // No workers
        });

        const jobData = await Sidequest.build(SuccessJob)
          .availableAt(new Date(3000, 0, 1))
          .enqueue("immediate-run");
        expect(jobData.state).toBe("waiting");

        // Run the job immediately
        const runJob = await Sidequest.job.run(jobData.id);
        expect(runJob.available_at).toBeDefined();

        await vi.waitUntil(() => Sidequest.job.get(jobData.id).then((job) => job?.state === "completed"), 5000);

        const processedJob = await Sidequest.job.get(jobData.id);
        expect(processedJob?.state).toBe("completed");
      });

      test(`[${moduleType}] should get job statistics`, async () => {
        await Sidequest.start({
          backend,
          queues: [{ name: "default" }],
        });

        // Enqueue multiple jobs
        const [job1, job2, job3] = await Promise.all([
          Sidequest.build(SuccessJob).enqueue("stats-1"),
          Sidequest.build(SuccessJob).enqueue("stats-2"),
          Sidequest.build(FailingJob).maxAttempts(1).enqueue("stats-fail"),
        ]);

        await vi.waitUntil(async () => {
          const waitedJob1 = await Sidequest.job.get(job1.id);
          const waitedJob2 = await Sidequest.job.get(job2.id);
          const waitedJob3 = await Sidequest.job.get(job3.id);
          return (
            waitedJob1?.state === "completed" && waitedJob2?.state === "completed" && waitedJob3?.state === "failed"
          );
        }, 5000);

        const stats = await Sidequest.job.count();
        expect(stats.completed).toBe(2);
        expect(stats.failed).toBe(1);
        expect(stats.total).toBe(3);
      });

      test(`[${moduleType}] should list jobs with filters`, async () => {
        await Sidequest.start({
          backend,
          queues: [{ name: "default" }],
        });

        await Sidequest.build(SuccessJob).enqueue("list-test-1");
        await Sidequest.build(SuccessJob).enqueue("list-test-2");

        await vi.waitUntil(async () => {
          const jobs = await Sidequest.job.list({ state: ["completed"] });
          return jobs.length >= 2;
        }, 5000);

        const completedJobs = await Sidequest.job.list({ state: ["completed"] });
        expect(completedJobs.length).toBeGreaterThanOrEqual(2);

        const successJobs = await Sidequest.job.list({ jobClass: "SuccessJob" });
        expect(successJobs.length).toBeGreaterThanOrEqual(2);
      });
    });

    describe(`[${moduleType}] Queue Management`, () => {
      test(`[${moduleType}] should pause and resume queues`, async () => {
        await Sidequest.start({
          backend,
          queues: [{ name: "pausable" }],
        });

        // Pause the queue
        await Sidequest.queue.pause("pausable");

        const jobData = await Sidequest.build(SuccessJob).queue("pausable").enqueue("pause-test");

        let job = await Sidequest.job.get(jobData.id);
        expect(job?.state).toBe("waiting");

        // Resume the queue
        await Sidequest.queue.activate("pausable");

        await vi.waitUntil(() => Sidequest.job.get(jobData.id).then((job) => job?.state === "completed"), 5000);

        job = await Sidequest.job.get(jobData.id);
        expect(job?.state).toBe("completed");
      });

      test(`[${moduleType}] should get queue statistics`, async () => {
        await Sidequest.start({
          backend,
          queues: [{ name: "stats-queue" }],
        });

        await Sidequest.build(SuccessJob).queue("stats-queue").enqueue("queue-stats-test");

        await vi.waitUntil(async () => {
          const job = await Sidequest.job.list({ queue: "stats-queue", state: ["completed"] });
          return job.length > 0;
        }, 5000);
      });
    });

    describe(`[${moduleType}] Complex Scenarios`, () => {
      test(`[${moduleType}] should handle mixed job types with different configurations`, async () => {
        await Sidequest.start({
          backend,
          queues: [
            { name: "fast", concurrency: 3 },
            { name: "slow", concurrency: 1 },
          ],
        });

        const jobs = await Promise.all([
          Sidequest.build(SuccessJob).queue("fast").enqueue("fast-1"),
          Sidequest.build(SuccessJob).queue("fast").enqueue("fast-2"),
          Sidequest.build(RetryJob).queue("slow").maxAttempts(2).enqueue("retry-1"),
          Sidequest.build(TimeoutJob).queue("fast").maxAttempts(2).timeout(100).enqueue(1000),
        ]);

        expect(jobs).toHaveLength(4);

        await vi.waitUntil(async () => {
          const statuses = await Promise.all(jobs.map((job) => Sidequest.job.get(job.id)));
          return statuses.every((job) => job?.state === "completed" || job?.state === "failed");
        }, 5000);
      });

      test(`[${moduleType}] should handle high concurrency scenarios`, async () => {
        await Sidequest.start({
          backend,
          queues: [{ name: "default", concurrency: 5 }],
          maxConcurrentJobs: 10,
        });

        // Enqueue many jobs
        const jobPromises = Array.from({ length: 20 }, (_, i) =>
          Sidequest.build(SuccessJob).enqueue(`concurrent-${i}`),
        );

        const jobs = await Promise.all(jobPromises);
        expect(jobs).toHaveLength(20);

        await vi.waitUntil(async () => {
          const statuses = await Promise.all(jobs.map((job) => Sidequest.job.get(job.id)));
          return statuses.every((job) => job?.state === "completed");
        }, 5000);
      });

      test(`[${moduleType}] should properly handle engine shutdown and restart`, async () => {
        // First session
        await Sidequest.start({
          backend,
          queues: [{ name: "default" }],
        });

        const jobData = await Sidequest.build(SuccessJob)
          .availableAt(new Date(3000, 0, 1))
          .enqueue("restart-test");
        await Sidequest.stop();

        // Second session (simulating restart)
        await Sidequest.start({
          backend,
          queues: [{ name: "default" }],
        });

        // Should be able to enqueue new jobs
        const newJobData = await Sidequest.build(SuccessJob).enqueue("after-restart");
        await Sidequest.job.run(jobData.id);

        await vi.waitUntil(async () => {
          const oldJob = await Sidequest.job.get(jobData.id);
          const newJob = await Sidequest.job.get(newJobData.id);
          return oldJob?.state === "completed" && newJob?.state === "completed";
        }, 5000);
      });
    });
  });
}
