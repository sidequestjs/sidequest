import { JobData } from "../schema";

/**
 * Configuration for a uniqueness strategy.
 */
export interface UniquenessConfig {
  /** The type of uniqueness strategy. */
  type: string;
}

/**
 * Interface for uniqueness strategies.
 * @template Config The configuration type for the uniqueness strategy.
 */
export interface Uniqueness<Config = UniquenessConfig> {
  /** The configuration for the uniqueness strategy. */
  config: Config;
  /**
   * Computes a digest (hash) for the given job data, or null if not applicable.
   * @param jobData The job data to compute the digest for.
   * @returns The digest string or null.
   */
  digest(jobData: JobData): string | null;
}
