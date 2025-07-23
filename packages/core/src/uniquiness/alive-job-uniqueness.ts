import { Uniqueness } from "./uniqueness";

import crypto from "crypto";
import { stringify } from "safe-stable-stringify";
import { logger } from "../logger";
import { JobData, JobState } from "../schema";

const aliveStates: JobState[] = ["waiting", "claimed", "running"];

/**
 * Configuration for alive job uniqueness strategy.
 */
export interface AliveJobConfig {
  /** The type of uniqueness strategy. */
  type: "alive-job";
  /** Whether to include job arguments in the digest. */
  withArgs?: boolean;
}

/**
 * Uniqueness strategy for jobs that are still alive (waiting, claimed, or running).
 */
export class AliveJobUniqueness implements Uniqueness {
  /**
   * Creates a new AliveJobUniqueness instance.
   * @param config The alive job uniqueness configuration.
   */
  constructor(public config: AliveJobConfig) {}

  /**
   * Computes a digest for the job data if the job is in an alive state.
   * @param jobData The job data to compute the digest for.
   * @returns The digest string or null if not alive.
   */
  digest(jobData: JobData): string | null {
    logger("Core").debug(`Creating alive digest for job ${jobData.id} with state ${jobData.state}`);
    if (aliveStates.includes(jobData.state)) {
      let key = jobData.class;
      if (this.config.withArgs) {
        key += "::args=" + stringify(jobData.args ?? []);
        key += "::ctor=" + stringify(jobData.constructor_args ?? []);
      }
      logger("Core").debug(`Job is alive. Key for digest: ${key}`);
      return crypto.createHash("sha256").update(key).digest("hex");
    }

    logger("Core").debug(`Job ${jobData.id} is not alive, returning null for digest.`);
    return null;
  }
}
