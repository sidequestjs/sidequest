import type { Backend, JobCounts } from "@sidequest/backend";
import { vi } from "vitest";

/** An all-zero {@link JobCounts}, for defaults in tests. */
export function zeroCounts(): JobCounts {
  return { total: 0, waiting: 0, claimed: 0, running: 0, completed: 0, failed: 0, canceled: 0 } as JobCounts;
}

/**
 * Minimal {@link Backend} test double: every method used by the API is a `vi.fn` with a
 * harmless default. Pass overrides for the methods a given test cares about.
 */
export function mockBackend(overrides: Partial<Backend> = {}): Backend {
  return {
    getJob: vi.fn().mockResolvedValue(undefined),
    listJobs: vi.fn().mockResolvedValue([]),
    getQueuesFromJobs: vi.fn().mockResolvedValue([]),
    countJobs: vi.fn().mockResolvedValue(zeroCounts()),
    countJobsByQueues: vi.fn().mockResolvedValue({}),
    countJobsOverTime: vi.fn().mockResolvedValue([]),
    listQueues: vi.fn().mockResolvedValue([]),
    getQueue: vi.fn().mockResolvedValue(undefined),
    updateQueue: vi.fn().mockImplementation((queue) => Promise.resolve(queue)),
    ...overrides,
  } as unknown as Backend;
}
