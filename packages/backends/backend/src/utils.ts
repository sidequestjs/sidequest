import { JobData } from "@sidequest/core";
import { Knex } from "knex";

/**
 * Safely parses a value as JSON, or returns the value if parsing fails.
 * @param value The value to parse.
 * @returns The parsed value, or null if input is null/undefined.
 */
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

/**
 * Safely parses a value as a Date object.
 * @param value The value to parse.
 * @returns The parsed Date, or null if input is null/undefined.
 */
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

/**
 * Safely parses all relevant fields of a JobData object.
 * @param job The job data to parse.
 * @returns The parsed JobData object.
 */
export function safeParseJobData(job: JobData): JobData {
  return {
    ...job,
    args: safeParse(job.args),
    constructor_args: safeParse(job.constructor_args),
    result: safeParse(job.result),
    errors: safeParse(job.errors),
    uniqueness_config: safeParse(job.uniqueness_config),
    attempted_at: safeParseDate(job.attempted_at),
    canceled_at: safeParseDate(job.canceled_at),
    claimed_at: safeParseDate(job.claimed_at),
    available_at: safeParseDate(job.available_at),
    completed_at: safeParseDate(job.completed_at),
    failed_at: safeParseDate(job.failed_at),
    inserted_at: safeParseDate(job.inserted_at),
  };
}

/**
 * Adds a where or whereIn clause to a Knex query builder, depending on the value type.
 * @param queryBuilder The Knex query builder.
 * @param column The column name.
 * @param value The value or array of values to filter by.
 * @returns The query builder.
 */
export function whereOrWhereIn(queryBuilder: Knex.QueryBuilder, column: string, value?: string | string[]) {
  if (value) {
    if (typeof value === "string") {
      queryBuilder.where(column, value);
    } else {
      queryBuilder.whereIn(column, value);
    }
  }
  return queryBuilder;
}
