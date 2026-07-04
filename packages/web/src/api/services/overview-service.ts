import type { Backend, JobCounts } from "@sidequest/backend";

const MS_BY_RANGE: Record<string, number> = {
  "12m": 12 * 60 * 1000,
  "12h": 12 * 60 * 60 * 1000,
  "12d": 12 * 24 * 60 * 60 * 1000,
};

/** Overview range token (`12m` | `12h` | `12d`) to milliseconds. Defaults to 12 minutes. */
export function rangeToMs(range?: string): number {
  return MS_BY_RANGE[range ?? "12m"] ?? MS_BY_RANGE["12m"];
}

/** Overview stats + time series for the dashboard home, framework-neutral (no HTTP). */
export class OverviewService {
  constructor(protected readonly backend: Backend) {}

  /**
   * Counts for the requested window, except `waiting`/`running`, which are reported
   * all-time: they are current-state gauges, not windowed events. Mirrors the old dashboard.
   */
  async counts(range?: string): Promise<JobCounts> {
    const from = new Date(Date.now() - rangeToMs(range));
    const [windowed, allTime] = await Promise.all([this.backend.countJobs({ from }), this.backend.countJobs()]);
    return { ...windowed, waiting: allTime.waiting, running: allTime.running };
  }

  /** Job counts bucketed over time, for the overview chart. */
  timeseries(range?: string): Promise<({ timestamp: Date } & JobCounts)[]> {
    return this.backend.countJobsOverTime(range ?? "12m");
  }
}
