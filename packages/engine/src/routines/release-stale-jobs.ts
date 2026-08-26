import { Backend } from "@sidequest/backend";
import { logger, RetryTransition } from "@sidequest/core";
import { inspect } from "util";
import { JobTransitionConflictError, JobTransitioner } from "../job";

/**
 * Finds and releases stale jobs, making them available for processing again.
 * @param backend The backend instance to operate on.
 * @param maxStaleMs Maximum age of a job to be considered stale.
 * @param maxClaimedMs Maximum age of a claimed job to be considered stale.
 * @returns A promise that resolves when the operation is complete.
 */
export async function releaseStaleJobs(backend: Backend, maxStaleMs: number, maxClaimedMs: number) {
  const staleJobs = await backend.staleJobs(maxStaleMs, maxClaimedMs);

  if (staleJobs.length > 0) {
    logger("Engine").info(`Stale jobs found, making them available to process`);
    logger("Engine").debug(`Stale jobs: ${inspect(staleJobs)}`);
    for (const jobData of staleJobs) {
      if (jobData.state === "running") {
        // We need to use the JobTransitioner to properly handle retries and state transitions
        // This fixes the issue where the release of a stale job incremented the retry count and
        // did not respect the maxRetries setting.
        try {
          await JobTransitioner.apply(backend, jobData, new RetryTransition("Stale job released for retry"));
        } catch (error) {
          if (!(error instanceof JobTransitionConflictError)) throw error;
          logger("Engine").debug(`Skipping stale snapshot for job ${jobData.id}: its execution changed`);
        }
      } else {
        // If it's "claimed", then the attempt count was not incremented, so we can just set it back to "waiting"
        const expected = {
          state: jobData.state,
          attempt: jobData.attempt,
          claimed_by: jobData.claimed_by ?? null,
          claimed_at: jobData.claimed_at ?? null,
          attempted_at: jobData.attempted_at ?? null,
        };
        jobData.state = "waiting";
        const updated = await backend.updateJobIfCurrent(jobData, expected);
        if (!updated) {
          logger("Engine").debug(`Skipping stale snapshot for job ${jobData.id}: its execution changed`);
        }
      }
    }
  } else {
    logger("Engine").debug(`No stale jobs found`);
  }
}
