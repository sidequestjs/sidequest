import { sidequestTest } from "@/tests/fixture";
import { JobData } from "@sidequest/core";
import { releaseStaleJobs } from "./release-stale-jobs";

describe("release-stale-jobs.ts", () => {
  sidequestTest("should do nothing when no stale jobs are found", async ({ backend }) => {
    const staleJobsSpy = vi.spyOn(backend, "staleJobs").mockResolvedValue([]);
    const updateJobSpy = vi.spyOn(backend, "updateJobIfCurrent");

    await releaseStaleJobs(backend, 600_000, 60_000);

    expect(staleJobsSpy).toHaveBeenCalledOnce();
    expect(updateJobSpy).not.toHaveBeenCalled();
  });

  sidequestTest("does not resurrect a job completed after the stale scan", async ({ backend }) => {
    const inserted = await backend.createNewJob({
      queue: "default",
      script: "./test-job.js",
      class: "TestJob",
      state: "waiting",
      args: [],
      constructor_args: [],
      attempt: 0,
      max_attempts: 3,
    });
    const staleSnapshot = await backend.updateJob({
      ...inserted,
      state: "running",
      attempt: 1,
      claimed_by: "worker-a",
      claimed_at: new Date(Date.now() - 120_000),
      attempted_at: new Date(Date.now() - 120_000),
      timeout: 1,
    });
    const completedAt = new Date();

    vi.spyOn(backend, "staleJobs").mockImplementationOnce(async () => {
      // Force the race deterministically: the scan owns the old running
      // snapshot, then the live executor commits completion before recovery
      // applies its transition.
      await backend.updateJob({
        ...staleSnapshot,
        state: "completed",
        completed_at: completedAt,
        result: { ok: true },
      });
      return [{ ...staleSnapshot }];
    });

    await releaseStaleJobs(backend, 1, 1);

    expect(await backend.getJob(inserted.id)).toMatchObject({
      state: "completed",
      completed_at: completedAt,
      result: { ok: true },
    });
  });

  sidequestTest("does not overwrite a newer execution of the same running job", async ({ backend }) => {
    const inserted = await backend.createNewJob({
      queue: "default",
      script: "./test-job.js",
      class: "TestJob",
      state: "waiting",
      args: [],
      constructor_args: [],
      attempt: 0,
      max_attempts: 3,
    });
    const staleSnapshot = await backend.updateJob({
      ...inserted,
      state: "running",
      attempt: 1,
      claimed_by: "worker-a",
      claimed_at: new Date(Date.now() - 120_000),
      attempted_at: new Date(Date.now() - 120_000),
      timeout: 1,
    });
    const newerClaimedAt = new Date();
    const newerAttemptedAt = new Date();

    vi.spyOn(backend, "staleJobs").mockImplementationOnce(async () => {
      // Model another sweep releasing attempt 1 and a worker starting attempt
      // 2 before this sweep resumes. State remains `running`, so a state-only
      // condition would still overwrite the new owner.
      await backend.updateJob({
        ...staleSnapshot,
        state: "running",
        attempt: 2,
        claimed_by: "worker-b",
        claimed_at: newerClaimedAt,
        attempted_at: newerAttemptedAt,
      });
      return [{ ...staleSnapshot }];
    });

    await releaseStaleJobs(backend, 1, 1);

    expect(await backend.getJob(inserted.id)).toMatchObject({
      state: "running",
      attempt: 2,
      claimed_by: "worker-b",
      claimed_at: newerClaimedAt,
      attempted_at: newerAttemptedAt,
    });
  });

  sidequestTest("does not release a claimed job that was re-claimed after the stale scan", async ({ backend }) => {
    const inserted = await backend.createNewJob({
      queue: "default",
      script: "./test-job.js",
      class: "TestJob",
      state: "waiting",
      args: [],
      constructor_args: [],
      attempt: 0,
      max_attempts: 3,
    });
    const staleSnapshot = await backend.updateJob({
      ...inserted,
      state: "claimed",
      claimed_by: "worker-a",
      claimed_at: new Date(Date.now() - 120_000),
    });
    const newerClaimedAt = new Date();

    vi.spyOn(backend, "staleJobs").mockImplementationOnce(async () => {
      await backend.updateJob({
        ...staleSnapshot,
        state: "claimed",
        claimed_by: "worker-b",
        claimed_at: newerClaimedAt,
      });
      return [{ ...staleSnapshot }];
    });

    await releaseStaleJobs(backend, 1, 1);

    expect(await backend.getJob(inserted.id)).toMatchObject({
      state: "claimed",
      claimed_by: "worker-b",
      claimed_at: newerClaimedAt,
    });
  });

  sidequestTest("should release stale claimed jobs by setting state to waiting", async ({ backend }) => {
    const mockStaleJob = {
      id: 1,
      queue: "default",
      state: "claimed",
      script: "/path/to/script.js",
      class: "TestJob",
      args: [],
      constructor_args: [],
      attempt: 1,
      max_attempts: 3,
      claimed_at: new Date(Date.now() - 60000),
    } as unknown as JobData;

    const staleJobsSpy = vi.spyOn(backend, "staleJobs").mockResolvedValue([mockStaleJob]);
    const updateJobSpy = vi
      .spyOn(backend, "updateJobIfCurrent")
      .mockImplementation((job) => Promise.resolve(job as JobData));

    await releaseStaleJobs(backend, 600_000, 60_000);

    expect(staleJobsSpy).toHaveBeenCalledOnce();
    expect(updateJobSpy).toHaveBeenCalledOnce();

    // Claimed jobs should go back to waiting without using JobTransitioner
    expect(mockStaleJob.state).toBe("waiting");
    expect(updateJobSpy).toHaveBeenCalledWith(mockStaleJob, expect.objectContaining({ state: "claimed" }));
  });

  sidequestTest("should retry stale running jobs using JobTransitioner", async ({ backend }) => {
    const mockStaleJob = {
      id: 2,
      queue: "high",
      state: "running",
      script: "/path/to/another-script.js",
      class: "AnotherTestJob",
      args: ["arg1", "arg2"],
      constructor_args: [],
      attempt: 2,
      max_attempts: 5,
      claimed_at: new Date(Date.now() - 120000),
    } as unknown as JobData;

    const staleJobsSpy = vi.spyOn(backend, "staleJobs").mockResolvedValue([mockStaleJob]);
    const updateJobSpy = vi.spyOn(backend, "updateJobIfCurrent").mockImplementation((job) => {
      return Promise.resolve(job as JobData);
    });

    await releaseStaleJobs(backend, 600_000, 60_000);

    expect(staleJobsSpy).toHaveBeenCalledOnce();
    expect(updateJobSpy).toHaveBeenCalledOnce();

    // Running jobs should be retried via JobTransitioner, which sets state to waiting
    expect(mockStaleJob.state).toBe("waiting");
  });

  sidequestTest("should fail stale running job at max attempts", async ({ backend }) => {
    const mockStaleJob = {
      id: 3,
      queue: "critical",
      state: "running",
      script: "/path/to/critical-script.js",
      class: "CriticalJob",
      args: [],
      constructor_args: [],
      attempt: 3,
      max_attempts: 3,
      claimed_at: new Date(Date.now() - 180000),
    } as unknown as JobData;

    const staleJobsSpy = vi.spyOn(backend, "staleJobs").mockResolvedValue([mockStaleJob]);
    const updateJobSpy = vi.spyOn(backend, "updateJobIfCurrent").mockImplementation((job) => {
      return Promise.resolve(job as JobData);
    });

    await releaseStaleJobs(backend, 600_000, 60_000);

    expect(staleJobsSpy).toHaveBeenCalledOnce();
    expect(updateJobSpy).toHaveBeenCalledOnce();

    // Job at max attempts should be marked as failed, not retried
    expect(mockStaleJob.state).toBe("failed");
  });

  sidequestTest("should handle mixed stale jobs (claimed and running)", async ({ backend }) => {
    const mockStaleJobs = [
      {
        id: 1,
        queue: "default",
        state: "claimed",
        script: "/path/to/script.js",
        class: "TestJob",
        args: [],
        constructor_args: [],
        attempt: 1,
        max_attempts: 3,
        claimed_at: new Date(Date.now() - 60000),
      },
      {
        id: 2,
        queue: "high",
        state: "running",
        script: "/path/to/another-script.js",
        class: "AnotherTestJob",
        args: ["arg1", "arg2"],
        constructor_args: [],
        attempt: 2,
        max_attempts: 5,
        claimed_at: new Date(Date.now() - 120000),
      },
    ] as unknown as JobData[];

    const staleJobsSpy = vi.spyOn(backend, "staleJobs").mockResolvedValue(mockStaleJobs);
    const updateJobSpy = vi.spyOn(backend, "updateJobIfCurrent").mockImplementation((job) => {
      return Promise.resolve(job as JobData);
    });

    await releaseStaleJobs(backend, 600_000, 60_000);

    expect(staleJobsSpy).toHaveBeenCalledOnce();
    expect(updateJobSpy).toHaveBeenCalledTimes(2);

    // Both should end up in waiting state
    expect(mockStaleJobs[0].state).toBe("waiting");
    expect(mockStaleJobs[1].state).toBe("waiting");
  });

  sidequestTest("should handle single stale job", async ({ backend }) => {
    const mockStaleJob = {
      id: 42,
      queue: "test-queue",
      state: "claimed",
      script: "/path/to/single-script.js",
      class: "SingleTestJob",
      args: ["single-arg"],
      constructor_args: [],
      attempt: 1,
      max_attempts: 3,
      claimed_at: new Date(Date.now() - 30000),
    } as unknown as JobData;

    const staleJobsSpy = vi.spyOn(backend, "staleJobs").mockResolvedValue([mockStaleJob]);
    const updateJobSpy = vi
      .spyOn(backend, "updateJobIfCurrent")
      .mockImplementation((job) => Promise.resolve(job as JobData));

    await releaseStaleJobs(backend, 600_000, 60_000);

    expect(staleJobsSpy).toHaveBeenCalledOnce();
    expect(updateJobSpy).toHaveBeenCalledOnce();
    expect(mockStaleJob.state).toBe("waiting");
    expect(updateJobSpy).toHaveBeenCalledWith(mockStaleJob, expect.objectContaining({ state: "claimed" }));
  });

  sidequestTest("should handle backend errors gracefully", async ({ backend }) => {
    const mockStaleJobs = [
      {
        id: 1,
        queue: "default",
        state: "claimed",
        script: "/path/to/script.js",
        class: "TestJob",
        args: [],
        constructor_args: [],
        attempt: 1,
        max_attempts: 3,
      },
    ] as unknown as JobData[];

    const staleJobsSpy = vi.spyOn(backend, "staleJobs").mockResolvedValue(mockStaleJobs);
    const updateJobSpy = vi.spyOn(backend, "updateJobIfCurrent").mockRejectedValue(new Error("Database error"));

    await expect(releaseStaleJobs(backend, 600_000, 60_000)).rejects.toThrow("Database error");

    expect(staleJobsSpy).toHaveBeenCalledOnce();
    expect(updateJobSpy).toHaveBeenCalledOnce();
    expect(mockStaleJobs[0].state).toBe("waiting");
  });

  sidequestTest("should handle staleJobs backend error", async ({ backend }) => {
    const staleJobsSpy = vi.spyOn(backend, "staleJobs").mockRejectedValue(new Error("Failed to fetch stale jobs"));
    const updateJobSpy = vi.spyOn(backend, "updateJobIfCurrent");

    await expect(releaseStaleJobs(backend, 600_000, 60_000)).rejects.toThrow("Failed to fetch stale jobs");

    expect(staleJobsSpy).toHaveBeenCalledOnce();
    expect(updateJobSpy).not.toHaveBeenCalled();
  });

  sidequestTest("should pass correct maxStaleMs parameter to backend", async ({ backend }) => {
    const staleJobsSpy = vi.spyOn(backend, "staleJobs").mockResolvedValue([]);

    const maxStaleMs = 300_000; // 5 minutes
    const maxClaimedMs = 30_000; // 30 seconds

    await releaseStaleJobs(backend, maxStaleMs, maxClaimedMs);

    expect(staleJobsSpy).toHaveBeenCalledWith(maxStaleMs, maxClaimedMs);
  });

  sidequestTest("should handle edge case timing values", async ({ backend }) => {
    const staleJobsSpy = vi.spyOn(backend, "staleJobs").mockResolvedValue([]);

    // Test with very large numbers
    const maxStaleMs = Number.MAX_SAFE_INTEGER;
    const maxClaimedMs = Number.MAX_SAFE_INTEGER - 1;

    await releaseStaleJobs(backend, maxStaleMs, maxClaimedMs);

    expect(staleJobsSpy).toHaveBeenCalledWith(maxStaleMs, maxClaimedMs);
  });

  sidequestTest("should handle millisecond precision timing", async ({ backend }) => {
    const staleJobsSpy = vi.spyOn(backend, "staleJobs").mockResolvedValue([]);

    // Test with precise millisecond values
    const maxStaleMs = 123.456; // fractional milliseconds
    const maxClaimedMs = 987.654;

    await releaseStaleJobs(backend, maxStaleMs, maxClaimedMs);

    expect(staleJobsSpy).toHaveBeenCalledWith(maxStaleMs, maxClaimedMs);
  });
});
