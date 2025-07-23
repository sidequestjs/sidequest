import { Uniqueness } from "./uniqueness";

import crypto from "crypto";
import { stringify } from "safe-stable-stringify";
import { logger } from "../logger";
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
 * Implements uniqueness checking using a fixed time window approach.
 *
 * This class generates unique digest keys for jobs based on their class name,
 * execution time (truncated to a configured period), and optionally their arguments.
 * Jobs with identical digests within the same time window are considered duplicates.
 *
 * The time window is determined by truncating the job's `available_at` timestamp
 * to the specified period granularity (second, minute, hour, day, week, or month).
 *
 * @example
 * ```typescript
 * const uniqueness = new FixedWindowUniqueness({
 *   period: 'hour',
 *   withArgs: true
 * });
 *
 * const digest = uniqueness.digest(jobData);
 * // Returns SHA256 hash of "JobClass::time=2023-01-01T15:00:00.000Z::args=[...]::ctor=[...]"
 * ```
 *
 * In this example, jobs of the same class scheduled within the same hour with the same arguments
 * will have the same digest and thus won't be duplicated.
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
    logger("Core").debug(`Creating digest for job ${jobData.id} with time window`);

    let key = `${jobData.class}::time=${timeString}`;

    if (this.config.withArgs) {
      key += "::args=" + stringify(jobData.args ?? []);
      key += "::ctor=" + stringify(jobData.constructor_args ?? []);
    }

    logger("Core").debug(`Uniqueness digest key: ${key}`);
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
