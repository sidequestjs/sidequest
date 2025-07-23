import { JobData, JobTransition, UniquenessFactory } from "@sidequest/core";
import { Engine } from "../engine";

/**
 * Handles applying job transitions and updating jobs in the backend.
 */
export class JobTransitioner {
  /**
   * Applies a transition to a job and updates it in the backend.
   * @param jobData The job data to update.
   * @param transition The job transition to apply.
   * @returns A promise resolving to the updated job data.
   */
  static apply(jobData: JobData, transition: JobTransition) {
    const backend = Engine.getBackend()!;
    const newData = transition.apply(jobData);
    if (newData.uniqueness_config) {
      const uniqueness = UniquenessFactory.create(newData.uniqueness_config);
      newData.unique_digest = uniqueness.digest(jobData);
    }
    return backend.updateJob(newData);
  }
}
