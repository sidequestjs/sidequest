import { Backend, JobExecutionFingerprint } from "@sidequest/backend";
import { JobData, JobTransition, logger, UniquenessFactory } from "@sidequest/core";
import { inspect } from "util";
import { JobTransitionConflictError } from "./job-transition-conflict-error";

/**
 * Handles applying job transitions and updating jobs in the backend.
 */
export class JobTransitioner {
  /**
   * Applies a transition to a job and updates it in the backend.
   *
   * This method checks if the transition should run based on the job's current state.
   * If applicable, it applies the transition and updates the job in the backend.
   *
   * @param jobData The job data to update.
   * @param transition The job transition to apply.
   * @returns A promise resolving to the updated job data.
   */
  static async apply(backend: Backend, jobData: JobData, transition: JobTransition): Promise<JobData> {
    if (!transition.shouldRun(jobData)) {
      logger("JobTransitioner").debug(
        `Transition ${transition.constructor.name} not applicable for job ${jobData.id}. Returning original job data.`,
      );
      return jobData;
    }

    logger("JobTransitioner").debug(`Applying transition ${transition.constructor.name} to job ${jobData.id}`);
    const expected: JobExecutionFingerprint = {
      state: jobData.state,
      attempt: jobData.attempt,
      claimed_by: jobData.claimed_by ?? null,
      claimed_at: jobData.claimed_at ?? null,
      attempted_at: jobData.attempted_at ?? null,
    };
    const newData = transition.apply(jobData);
    if (newData.uniqueness_config) {
      const uniqueness = UniquenessFactory.create(newData.uniqueness_config);
      newData.unique_digest = uniqueness.digest(jobData);
    }
    logger("JobTransitioner").debug(`Updating with new job data: ${inspect(newData)}`);
    const updated = await backend.updateJobIfCurrent(newData, expected);
    if (!updated) {
      throw new JobTransitionConflictError(jobData.id, transition.constructor.name);
    }
    return updated;
  }
}
