import { Uniqueness } from "./uniqueness";

import crypto from "crypto";
import stableStringify from "json-stable-stringify";
import { JobData } from "../schema";

export type TimePeriod = "second" | "minute" | "hour" | "day" | "week" | "month";

export interface FixedWindowConfig {
  type: "fixed-window";
  period: TimePeriod;
  withArgs?: boolean;
}

export class FixedWindowUniqueness implements Uniqueness {
  constructor(public config: FixedWindowConfig) {}

  digest(jobData: JobData): string | null {
    const timeString = this.truncateDateString(jobData.available_at ?? new Date());

    let key = `${jobData.class}::time=${timeString}`;

    if (this.config.withArgs) {
      key += "::args=" + stableStringify(jobData.args ?? []);
      key += "::ctor=" + stableStringify(jobData.constructor_args ?? []);
    }

    return crypto.createHash("sha256").update(key).digest("hex");
  }

  private truncateDateString(date: Date): string {
    const truncateDate = new Date(date);

    switch (this.config.period) {
      case "second":
        truncateDate.setUTCMilliseconds(0);
        break;
      case "minute":
        truncateDate.setUTCSeconds(0, 0);
        break;
      case "hour":
        truncateDate.setUTCMinutes(0, 0, 0);
        break;
      case "day":
        truncateDate.setUTCHours(0, 0, 0, 0);
        break;
      case "week": {
        const day = truncateDate.getUTCDay(); // 0 = Sunday
        const diff = truncateDate.getUTCDate() - day;
        truncateDate.setUTCDate(diff);
        truncateDate.setUTCHours(0, 0, 0, 0);
        break;
      }
      case "month":
        truncateDate.setUTCDate(1);
        truncateDate.setUTCHours(0, 0, 0, 0);
        break;
      default:
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        throw new Error(`Unsupported period: ${this.config.period}`);
    }

    return truncateDate.toISOString();
  }
}
