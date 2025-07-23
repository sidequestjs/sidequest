import { Uniqueness } from "./uniqueness";

import crypto from "crypto";
import stableStringify from "json-stable-stringify";
import { JobData, JobState } from "../schema";

const aliveStates: JobState[] = ["waiting", "claimed", "running"];

export interface AliveJobConfig {
  type: "alive-job";
  withArgs?: boolean;
}

export class AliveJobUniqueness implements Uniqueness {
  constructor(public config: AliveJobConfig) {}

  digest(jobData: JobData): string | null {
    if (aliveStates.includes(jobData.state)) {
      let key = jobData.class;
      if (this.config.withArgs) {
        key += "::args=" + stableStringify(jobData.args ?? []);
        key += "::ctor=" + stableStringify(jobData.constructor_args ?? []);
      }
      return crypto.createHash("sha256").update(key).digest("hex");
    }

    return null;
  }
}
