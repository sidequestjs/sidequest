import { JobData } from "@sidequest/core";

export function safeParse<T>(value: unknown): T;
export function safeParse(value: null | undefined): null;
export function safeParse<T>(value: unknown): T | null {
  if (value !== undefined && value !== null) {
    try {
      return (typeof value === "string" ? JSON.parse(value) : value) as T;
    } catch {
      return value as T;
    }
  } else {
    return null;
  }
}

export function safeParseDate(value: string | number | Date): Date;
export function safeParseDate(value: null | undefined): null;
export function safeParseDate(value: null | Date): null;
export function safeParseDate(value?: string | number | Date | null): Date | null {
  if (value !== undefined && value !== null) {
    return new Date(value);
  } else {
    return null;
  }
}

export function safeParseJobData(job: JobData): JobData {
  return {
    ...job,
    args: safeParse(job.args),
    constructor_args: safeParse(job.constructor_args),
    result: safeParse(job.result),
    errors: safeParse(job.errors),
    uniqueness_config: safeParse(job.uniqueness_config),
    attempted_at: safeParseDate(job.attempted_at),
    cancelled_at: safeParseDate(job.cancelled_at),
    claimed_at: safeParseDate(job.claimed_at),
    available_at: safeParseDate(job.available_at),
    completed_at: safeParseDate(job.completed_at),
    failed_at: safeParseDate(job.failed_at),
    inserted_at: safeParseDate(job.inserted_at),
  };
}
