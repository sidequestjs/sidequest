import type { Context } from "hono";
import type { JobListFilters } from "./services/job-service";

const MINUTES_BY_RANGE: Record<string, number> = {
  "5m": 5,
  "15m": 15,
  "30m": 30,
  "1h": 60,
  "4h": 240,
  "12h": 720,
  "24h": 1440,
  "2d": 2880,
  "7d": 10080,
  "30d": 43200,
};

/**
 * Turns a relative range token (`5m`..`30d`), `custom` + `start`/`end`, or nothing into an
 * absolute time range. Returns `undefined` for "any"/unknown so no time filter is applied.
 */
export function computeTimeRange(time?: string, start?: string, end?: string): { from?: Date; to?: Date } | undefined {
  if (!time || time === "any") return undefined;

  const minutes = MINUTES_BY_RANGE[time];
  if (minutes) return { from: new Date(Date.now() - minutes * 60_000) };

  if (time === "custom" && start && end) {
    const from = new Date(start);
    const to = new Date(end);
    if (!isNaN(from.getTime()) && !isNaN(to.getTime())) return { from, to };
  }

  return undefined;
}

/** The parsed `/jobs` query: service filters plus pagination. */
export interface ParsedJobQuery {
  filters: JobListFilters;
  page: number;
  pageSize: number;
}

/** Parses the `/jobs` query string into service filters + pagination. */
export function parseJobQuery(c: Context): ParsedJobQuery {
  const q = c.req.query();
  const trimmed = (v?: string) => {
    const t = v?.trim();
    return t === "" ? undefined : t;
  };

  const pageSize = q.pageSize ? parseInt(q.pageSize, 10) : 30;
  const page = q.page ? Math.max(parseInt(q.page, 10), 1) : 1;
  const jobClass = trimmed(q.class);

  return {
    page,
    pageSize,
    filters: {
      queue: trimmed(q.queue),
      // substring match, mirroring the old dashboard filter
      jobClass: jobClass ? `%${jobClass}%` : undefined,
      state: trimmed(q.state) as JobListFilters["state"],
      timeRange: computeTimeRange(trimmed(q.time), q.start, q.end),
    },
  };
}
