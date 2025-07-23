import { JobData } from "packages/core/dist";
import type { NewQueueData } from "./backend";

/**
 * Default fallback values for new job data.
 *
 * Provides sensible defaults for job properties including:
 * - Empty arrays for arguments and constructor arguments
 * - Maximum of 5 retry attempts
 * - Current timestamp for availability
 * - No timeout or uniqueness constraints
 *
 * @example
 * ```typescript
 * const newJob = { ...JOB_FALLBACK, name: 'my-job' };
 * ```
 */
export const JOB_FALLBACK: Required<
  Pick<
    JobData,
    | "args"
    | "constructor_args"
    | "max_attempts"
    | "available_at"
    | "timeout"
    | "uniqueness_config"
    | "unique_digest"
    | "errors"
    | "result"
    | "attempted_at"
    | "completed_at"
    | "failed_at"
    | "cancelled_at"
    | "claimed_at"
    | "claimed_by"
  >
> = {
  args: [],
  constructor_args: [],
  max_attempts: 5,
  get available_at() {
    return new Date();
  },
  timeout: null,
  uniqueness_config: null,
  unique_digest: null,
  errors: null,
  result: null,
  attempted_at: null,
  completed_at: null,
  failed_at: null,
  cancelled_at: null,
  claimed_at: null,
  claimed_by: null,
};

/**
 * Default fallback values for queue configuration.
 *
 * Provides sensible defaults for queue properties when they are not explicitly specified:
 * - Sets concurrency to 10 for moderate parallel processing
 * - Sets priority to 0 as the default priority level
 * - Sets state to "active" to enable queue processing by default
 *
 * @example
 * ```typescript
 * const queueConfig = { ...QUEUE_FALLBACK, name: 'my-queue' };
 * ```
 */
export const QUEUE_FALLBACK: Required<Omit<NewQueueData, "name">> = {
  concurrency: 10,
  priority: 0,
  state: "active",
};

/**
 * Fallback configuration for miscellaneous operations with timing constraints.
 *
 * @property maxStaleMs - Maximum time in milliseconds before data is considered stale (10 minutes)
 * @property maxClaimedMs - Maximum time in milliseconds an item can remain claimed (1 minute)
 */
export const MISC_FALLBACK = {
  maxStaleMs: 600_000, // 10 minutes
  maxClaimedMs: 60_000, // 1 minute
};
