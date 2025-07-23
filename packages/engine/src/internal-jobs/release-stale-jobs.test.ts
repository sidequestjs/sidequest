import { JobData } from "@sidequest/core";
import { unlink } from "fs";
import { Engine, SidequestConfig } from "../engine";
import { ReleaseStaleJob } from "./release-stale-jobs";

describe("release-stale-jobs.ts", () => {
  const dbLocation = "./sidequest-test-release-stale.sqlite";
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

  describe("ReleaseStaleJob", () => {
    it("should extend Job class", async () => {
      const job = new ReleaseStaleJob();
      await job.ready();
      expect(job.className).toBe("ReleaseStaleJob");
      expect(typeof job.script).toBe("string");
    });

    it("should do nothing when no stale jobs are found", async () => {
      const backend = Engine.getBackend();
      const staleJobsSpy = vi.spyOn(backend, "staleJobs").mockResolvedValue([]);
      const updateJobSpy = vi.spyOn(backend, "updateJob");

      const job = new ReleaseStaleJob();
      await job.run();

      expect(staleJobsSpy).toHaveBeenCalledOnce();
      expect(updateJobSpy).not.toHaveBeenCalled();
    });

    it("should release stale jobs by setting state to waiting", async () => {
      const mockStaleJobs: JobData[] = [
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
          claimed_at: new Date(Date.now() - 60000), // 1 minute ago
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
          claimed_at: new Date(Date.now() - 120000), // 2 minutes ago
        },
      ];

      const backend = Engine.getBackend();
      const staleJobsSpy = vi.spyOn(backend, "staleJobs").mockResolvedValue(mockStaleJobs);
      const updateJobSpy = vi.spyOn(backend, "updateJob").mockImplementation((job) => Promise.resolve(job));

      const job = new ReleaseStaleJob();
      await job.run();

      expect(staleJobsSpy).toHaveBeenCalledOnce();
      expect(updateJobSpy).toHaveBeenCalledTimes(2);

      // Verify that each stale job's state was set to 'waiting'
      expect(mockStaleJobs[0].state).toBe("waiting");
      expect(mockStaleJobs[1].state).toBe("waiting");

      // Verify updateJob was called with the modified jobs
      expect(updateJobSpy).toHaveBeenNthCalledWith(1, mockStaleJobs[0]);
      expect(updateJobSpy).toHaveBeenNthCalledWith(2, mockStaleJobs[1]);
    });

    it("should handle single stale job", async () => {
      const mockStaleJob: JobData = {
        id: 42,
        queue: "test-queue",
        state: "claimed",
        script: "/path/to/single-script.js",
        class: "SingleTestJob",
        args: ["single-arg"],
        constructor_args: [],
        attempt: 1,
        max_attempts: 3,
        claimed_at: new Date(Date.now() - 30000), // 30 seconds ago
      };

      const backend = Engine.getBackend();
      const staleJobsSpy = vi.spyOn(backend, "staleJobs").mockResolvedValue([mockStaleJob]);
      const updateJobSpy = vi.spyOn(backend, "updateJob").mockImplementation((job) => Promise.resolve(job));

      const job = new ReleaseStaleJob();
      await job.run();

      expect(staleJobsSpy).toHaveBeenCalledOnce();
      expect(updateJobSpy).toHaveBeenCalledOnce();
      expect(mockStaleJob.state).toBe("waiting");
      expect(updateJobSpy).toHaveBeenCalledWith(mockStaleJob);
    });

    it("should handle backend errors gracefully", async () => {
      const mockStaleJobs: JobData[] = [
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
      ];

      const backend = Engine.getBackend();
      const staleJobsSpy = vi.spyOn(backend, "staleJobs").mockResolvedValue(mockStaleJobs);
      const updateJobSpy = vi.spyOn(backend, "updateJob").mockRejectedValue(new Error("Database error"));

      const job = new ReleaseStaleJob();

      // The job should throw the error since it's not handled in the implementation
      await expect(job.run()).rejects.toThrow("Database error");

      expect(staleJobsSpy).toHaveBeenCalledOnce();
      expect(updateJobSpy).toHaveBeenCalledOnce();
      expect(mockStaleJobs[0].state).toBe("waiting");
    });

    it("should handle staleJobs backend error", async () => {
      const backend = Engine.getBackend();
      const staleJobsSpy = vi.spyOn(backend, "staleJobs").mockRejectedValue(new Error("Failed to fetch stale jobs"));
      const updateJobSpy = vi.spyOn(backend, "updateJob");

      const job = new ReleaseStaleJob();

      await expect(job.run()).rejects.toThrow("Failed to fetch stale jobs");

      expect(staleJobsSpy).toHaveBeenCalledOnce();
      expect(updateJobSpy).not.toHaveBeenCalled();
    });
  });
});
