import { ErrorData } from "./error-data";

export type JobState =
  | "waiting" // Ready or scheduled for execution
  | "claimed" // Reserved by a worker
  | "running" // Currently executing
  | "failed" // Permanently failed (max attempts exceeded)
  | "completed" // Finished successfully
  | "canceled"; // Manually canceled

export interface JobData {
  id?: number;
  queue: string;
  state?: JobState;
  script: string;
  class: string;
  args: unknown[];
  constructor_args: unknown[];
  timeout?: number;
  attempt: number;
  max_attempts: number;
  result?: unknown;
  errors?: ErrorData[];
  inserted_at?: Date;
  attempted_at?: Date;
  available_at?: Date;
  completed_at?: Date;
  failed_at?: Date;
  cancelled_at?: Date;
  claimed_at?: Date;
  claimed_by?: string;
  unique_digest?: string;
}
