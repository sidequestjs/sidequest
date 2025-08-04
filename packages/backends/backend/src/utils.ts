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
      queryBuilder.where(column, "LIKE", value);
    } else {
      queryBuilder.whereIn(column, value);
    }
  }
  return queryBuilder;
}

/**
 * Formats a Date object into a string representation suitable for time-based bucketing operations.
 * The output format varies based on the specified time unit, truncating precision to align with bucket boundaries.
 *
 * @param date - The Date object to format
 * @param unit - The time unit for bucketing:
 *   - "m": minute-level precision (YYYY-MM-DD HH:mm:00)
 *   - "h": hour-level precision (YYYY-MM-DD HH:00:00)
 *   - "d": day-level precision (YYYY-MM-DD 00:00:00)
 * @returns A formatted date string with precision truncated to the specified unit
 */
export function formatDateForBucket(date: Date | string | number, unit: "m" | "h" | "d"): string {
  date = new Date(date);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hour = String(date.getUTCHours()).padStart(2, "0");
  const minute = String(date.getUTCMinutes()).padStart(2, "0");

  switch (unit) {
    case "m":
      return `${year}-${month}-${day}T${hour}:${minute}:00.000Z`;
    case "h":
      return `${year}-${month}-${day}T${hour}:00:00.000Z`;
    case "d":
      return `${year}-${month}-${day}T00:00:00.000Z`;
  }
}
