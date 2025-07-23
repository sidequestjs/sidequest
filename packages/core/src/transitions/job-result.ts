import { ErrorData } from "../schema";
import { CompleteTransition } from "./complete-transition";
import { FailTransition } from "./fail-transition";
import { RetryTransition } from "./retry-transition";
import { SnoozeTransition } from "./snooze-transition";

/**
 * Possible job result types.
 */
type JobResultType = "retry" | "completed" | "failed" | "snooze";

/**
 * Base interface for job result objects.
 */
interface BaseResult {
  /** Marker for job transition objects. */
  __is_job_transition__: true;
  /** The type of job result. */
  type: JobResultType;
}

/**
 * Result for a retry transition.
 */
export type RetryResult = BaseResult & { type: "retry"; delay?: number; error: ErrorData };
/**
 * Result for a failed transition.
 */
export type FailedResult = BaseResult & { type: "failed"; error: ErrorData };
/**
 * Result for a completed transition.
 */
export type CompletedResult = BaseResult & { type: "completed"; result: unknown };
/**
 * Result for a snooze transition.
 */
export type SnoozeResult = BaseResult & { type: "snooze"; delay: number };

/**
 * Union type for all job results.
 */
export type JobResult = RetryResult | FailedResult | CompletedResult | SnoozeResult;

/**
 * Factory for creating job transitions from job results.
 */
export class JobTransitionFactory {
  /**
   * Creates a job transition instance from a job result.
   * @param jobResult The job result object.
   * @returns The corresponding job transition instance.
   */
  static create(jobResult: JobResult) {
    switch (jobResult.type) {
      case "retry":
        return new RetryTransition(jobResult.error, jobResult.delay);
      case "snooze":
        return new SnoozeTransition(jobResult.delay);
      case "failed":
        return new FailTransition(jobResult.error);
      case "completed":
        return new CompleteTransition(jobResult.result);
    }
  }
}

/**
 * Checks if a value is a JobResult object. If this returns false, it is probably a raw job result.
 * @param value The value to check.
 * @returns True if the value is a JobResult.
 */
export function isJobResult(value: unknown): value is JobResult {
  return !!value && typeof value === "object" && "__is_job_transition__" in value && !!value.__is_job_transition__;
}
