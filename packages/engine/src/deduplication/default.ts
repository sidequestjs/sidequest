import { Engine } from "../engine";
import { JobClassType } from "../job/job";
import { DeduplicationStrategy } from "./strategy";

export class DefaultDeduplicationStrategy implements DeduplicationStrategy {
  constructor(public withArgs = false) {}

  async isDuplicated<T extends JobClassType>(JobClass: T, args: Parameters<T["prototype"]["run"]>) {
    const backend = Engine.getBackend();
    const queuedJob = await backend.listJobs({
      jobClass: JobClass.name,
      state: ["claimed", "running", "waiting"],
      args: this.withArgs ? args : undefined,
    });

    if (queuedJob.length > 0) {
      return true;
    }

    return false;
  }
}
