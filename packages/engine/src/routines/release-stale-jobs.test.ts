import { JobData } from "@sidequest/core";
import { Engine, SidequestConfig } from "../engine";
import { releaseStaleJobs } from "./release-stale-jobs";

describe("release-stale-jobs.ts", () => {
  const dbLocation = ":memory:";
  const config: SidequestConfig = {
    backend: { driver: "@sidequest/sqlite-backend", config: dbLocation },
  };

  beforeEach(async () => {
    await Engine.configure(config);
  });

  afterEach(async () => {
    await Engine.close();
  });

  it("should do nothing when no stale jobs are found", async () => {
    const backend = Engine.getBackend();
    const staleJobsSpy = vi.spyOn(backend!, "staleJobs").mockResolvedValue([]);
    const updateJobSpy = vi.spyOn(backend!, "updateJob");

    await releaseStaleJobs(backend!, 600_000, 60_000);

    expect(staleJobsSpy).toHaveBeenCalledOnce();
    expect(updateJobSpy).not.toHaveBeenCalled();
  });

  it("should release stale jobs by setting state to waiting", async () => {
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

    const backend = Engine.getBackend();
    const staleJobsSpy = vi.spyOn(backend!, "staleJobs").mockResolvedValue(mockStaleJobs);
    const updateJobSpy = vi.spyOn(backend!, "updateJob").mockImplementation((job) => Promise.resolve(job as JobData));

    await releaseStaleJobs(backend!, 600_000, 60_000);

    expect(staleJobsSpy).toHaveBeenCalledOnce();
    expect(updateJobSpy).toHaveBeenCalledTimes(2);

    expect(mockStaleJobs[0].state).toBe("waiting");
    expect(mockStaleJobs[1].state).toBe("waiting");

    expect(updateJobSpy).toHaveBeenNthCalledWith(1, mockStaleJobs[0]);
    expect(updateJobSpy).toHaveBeenNthCalledWith(2, mockStaleJobs[1]);
  });

  it("should handle single stale job", async () => {
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

    const backend = Engine.getBackend();
    const staleJobsSpy = vi.spyOn(backend!, "staleJobs").mockResolvedValue([mockStaleJob]);
    const updateJobSpy = vi.spyOn(backend!, "updateJob").mockImplementation((job) => Promise.resolve(job as JobData));

    await releaseStaleJobs(backend!, 600_000, 60_000);

    expect(staleJobsSpy).toHaveBeenCalledOnce();
    expect(updateJobSpy).toHaveBeenCalledOnce();
    expect(mockStaleJob.state).toBe("waiting");
    expect(updateJobSpy).toHaveBeenCalledWith(mockStaleJob);
  });

  it("should handle backend errors gracefully", async () => {
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

    const backend = Engine.getBackend();
    const staleJobsSpy = vi.spyOn(backend!, "staleJobs").mockResolvedValue(mockStaleJobs);
    const updateJobSpy = vi.spyOn(backend!, "updateJob").mockRejectedValue(new Error("Database error"));

    await expect(releaseStaleJobs(backend!, 600_000, 60_000)).rejects.toThrow("Database error");

    expect(staleJobsSpy).toHaveBeenCalledOnce();
    expect(updateJobSpy).toHaveBeenCalledOnce();
    expect(mockStaleJobs[0].state).toBe("waiting");
  });

  it("should handle staleJobs backend error", async () => {
    const backend = Engine.getBackend();
    const staleJobsSpy = vi.spyOn(backend!, "staleJobs").mockRejectedValue(new Error("Failed to fetch stale jobs"));
    const updateJobSpy = vi.spyOn(backend!, "updateJob");

    await expect(releaseStaleJobs(backend!, 600_000, 60_000)).rejects.toThrow("Failed to fetch stale jobs");

    expect(staleJobsSpy).toHaveBeenCalledOnce();
    expect(updateJobSpy).not.toHaveBeenCalled();
  });

  it("should pass correct maxStaleMs parameter to backend", async () => {
    const backend = Engine.getBackend();
    const staleJobsSpy = vi.spyOn(backend!, "staleJobs").mockResolvedValue([]);

    const maxStaleMs = 300_000; // 5 minutes
    const maxClaimedMs = 30_000; // 30 seconds

    await releaseStaleJobs(backend!, maxStaleMs, maxClaimedMs);

    expect(staleJobsSpy).toHaveBeenCalledWith(maxStaleMs, maxClaimedMs);
  });

  it("should handle edge case timing values", async () => {
    const backend = Engine.getBackend();
    const staleJobsSpy = vi.spyOn(backend!, "staleJobs").mockResolvedValue([]);

    // Test with very large numbers
    const maxStaleMs = Number.MAX_SAFE_INTEGER;
    const maxClaimedMs = Number.MAX_SAFE_INTEGER - 1;

    await releaseStaleJobs(backend!, maxStaleMs, maxClaimedMs);

    expect(staleJobsSpy).toHaveBeenCalledWith(maxStaleMs, maxClaimedMs);
  });

  it("should handle millisecond precision timing", async () => {
    const backend = Engine.getBackend();
    const staleJobsSpy = vi.spyOn(backend!, "staleJobs").mockResolvedValue([]);

    // Test with precise millisecond values
    const maxStaleMs = 123.456; // fractional milliseconds
    const maxClaimedMs = 987.654;

    await releaseStaleJobs(backend!, maxStaleMs, maxClaimedMs);

    expect(staleJobsSpy).toHaveBeenCalledWith(maxStaleMs, maxClaimedMs);
  });
});
