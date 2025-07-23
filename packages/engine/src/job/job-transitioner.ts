import { JobData, JobTransition, UniquenessFactory } from "@sidequest/core";
import { Engine } from "../engine";

export class JobTransitioner {
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
