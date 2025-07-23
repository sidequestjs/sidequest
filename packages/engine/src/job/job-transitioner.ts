import { JobData, JobTransition } from "@sidequest/core";
import { Engine } from "../engine";

export class JobTransitioner {
  static apply(jobData: JobData, transition: JobTransition) {
    const backend = Engine.getBackend();
    const newData = transition.apply(jobData);
    return backend.updateJob(newData);
  }
}
