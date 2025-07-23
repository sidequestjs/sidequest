import { UniquenessConfig } from "../uniquiness";
import { ErrorData } from "./error-data";

export type JobState =
  | "waiting" // Ready or scheduled for execution
  | "claimed" // Reserved by a worker
  | "running" // Currently executing
  | "failed" // Permanently failed (max attempts exceeded)
  | "completed" // Finished successfully
  | "canceled"; // Manually canceled

export interface JobData {
  id: number;
  queue: string;
  state: JobState;
  script: string;
  class: string;
  args: unknown[];
  constructor_args: unknown[];
  attempt: number;
  max_attempts: number;
  inserted_at: Date;
  available_at: Date;
  timeout: number | null;
  result: Omit<unknown, "undefined"> | null;
  errors: ErrorData[] | null;
  attempted_at: Date | null;
  completed_at: Date | null;
  failed_at: Date | null;
  cancelled_at: Date | null;
  claimed_at: Date | null;
  claimed_by: string | null;
  unique_digest: string | null;
  uniqueness_config: UniquenessConfig | null;
}
