import { ErrorData } from "../schema";
import { CompleteTransition } from "./complete-transition";
import { FailTransition } from "./fail-transition";
import { RetryTransition } from "./retry-transition";
import { SnoozeTransition } from "./snooze-transition";

type JobResultType = "retry" | "completed" | "failed" | "snooze";

interface BaseResult {
  __is_job_transition__: true;
  type: JobResultType;
}

export type RetryResult = BaseResult & { type: "retry"; delay?: number; error: ErrorData };
export type FailedResult = BaseResult & { type: "failed"; error: ErrorData };
export type CompletedResult = BaseResult & { type: "completed"; result: unknown };
export type SnoozeResult = BaseResult & { type: "snooze"; delay: number };

export type JobResult = RetryResult | FailedResult | CompletedResult | SnoozeResult;

export class JobTransitionFactory {
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

export function isJobResult(value: unknown): value is JobResult {
  return !!value && typeof value === "object" && "__is_job_transition__" in value && !!value.__is_job_transition__;
}
