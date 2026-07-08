import type { Backend, JobCounts } from "@sidequest/backend";
import type { QueueConfig } from "@sidequest/core";
import { QueueNotFoundError } from "../errors";

/** A queue plus the job counts for it (as shown in the queues table). */
export interface QueueWithCounts extends QueueConfig {
  jobs?: JobCounts;
}

/**
 * Read/mutation operations over queues, framework-neutral (no HTTP).
 * Override seam for the Pro, same pattern as {@link JobService}.
 */
export class QueueService {
  constructor(protected readonly backend: Backend) {}

  /** Lists queues ordered by name, each annotated with its job counts. */
  async list(): Promise<QueueWithCounts[]> {
    const [queues, counts] = await Promise.all([
      this.backend.listQueues({ column: "name", order: "asc" }),
      this.backend.countJobsByQueues(),
    ]);
    return queues.map((queue) => ({ ...queue, jobs: counts[queue.name] }));
  }

  /** Flips a queue between active and paused. Throws {@link QueueNotFoundError} if missing. */
  async toggle(name: string): Promise<QueueConfig> {
    const queue = await this.backend.getQueue(name);
    if (!queue) throw new QueueNotFoundError(name);
    const state = queue.state === "active" ? "paused" : "active";
    return this.backend.updateQueue({ ...queue, state });
  }
}
