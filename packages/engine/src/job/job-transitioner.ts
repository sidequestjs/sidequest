import { JobData, JobTransition, logger, UniquenessFactory } from "@sidequest/core";
import { Engine } from "../engine";

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
  static apply(jobData: JobData, transition: JobTransition) {
    if (!transition.shouldRun(jobData)) {
      logger("JobTransitioner").debug(
        `Transition ${transition.constructor.name} not applicable for job ${jobData.id}. Returning original job data.`,
      );
      return jobData;
    }

    logger("JobTransitioner").info(`Applying transition ${transition.constructor.name} to job ${jobData.id}`);
    const backend = Engine.getBackend()!;
    const newData = transition.apply(jobData);
    if (newData.uniqueness_config) {
      const uniqueness = UniquenessFactory.create(newData.uniqueness_config);
      newData.unique_digest = uniqueness.digest(jobData);
    }
    logger("JobTransitioner").debug(`Updating with new job data: ${JSON.stringify(newData)}`);
    return backend.updateJob(newData);
  }
}
