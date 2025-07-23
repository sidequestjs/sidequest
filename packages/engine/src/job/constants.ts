import { JOB_FALLBACK } from "@sidequest/backend";
import type { JobBuilderDefaults } from "./job-builder";

/**
 * Default configuration values for job builders.
 *
 * Provides fallback settings when specific job configuration options are not explicitly set.
 *
 * @remarks
 * - Uses "default" queue for job processing
 * - No timeout limit by default
 * - Uniqueness checking disabled
 * - Maximum of 5 retry attempts on failure
 * - Jobs are immediately available for processing
 * - No constructor arguments passed by default
 */
export const JOB_BUILDER_FALLBACK: JobBuilderDefaults & { constructorArgs: unknown[] } = {
  queue: "default",
  timeout: undefined,
  uniqueness: false,
  maxAttempts: JOB_FALLBACK.max_attempts!,
  get availableAt() {
    return new Date();
  },
  constructorArgs: [],
};
