import { Uniqueness } from "./uniqueness";

import crypto from "crypto";
import { stringify } from "safe-stable-stringify";
import { JobData } from "../schema";

/**
 * Time period granularity for fixed window uniqueness.
 */
export type TimePeriod = "second" | "minute" | "hour" | "day" | "week" | "month";

/**
 * Configuration for fixed window uniqueness strategy.
 */
export interface FixedWindowConfig {
  /** The type of uniqueness strategy. */
  type: "fixed-window";
  /** The time period granularity. */
  period: TimePeriod;
  /** Whether to include job arguments in the digest. */
  withArgs?: boolean;
}

/**
 * Uniqueness strategy based on fixed time windows.
 */
export class FixedWindowUniqueness implements Uniqueness {
  /**
   * Creates a new FixedWindowUniqueness instance.
   * @param config The fixed window configuration.
   */
  constructor(public config: FixedWindowConfig) {}

  /**
   * Computes a digest for the job data based on the configured time window and arguments.
   * @param jobData The job data to compute the digest for.
   * @returns The digest string.
   */
  digest(jobData: JobData): string | null {
    const timeString = this.truncateDateString(jobData.available_at ?? new Date());

    let key = `${jobData.class}::time=${timeString}`;

    if (this.config.withArgs) {
      key += "::args=" + stringify(jobData.args ?? []);
      key += "::ctor=" + stringify(jobData.constructor_args ?? []);
    }

    return crypto.createHash("sha256").update(key).digest("hex");
  }

  /**
   * Truncates a date to the configured time period granularity.
   * @param date The date to truncate.
   * @returns The truncated date as an ISO string.
   */
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
