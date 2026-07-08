import { QueryClient } from "@tanstack/react-query";

/**
 * The narrow options a dashboard query hook forwards to TanStack Query. Kept small on purpose
 * (the hooks own their query keys and fetchers); callers only steer polling and enablement.
 */
export interface QueryHookOptions {
  /** If set, refetch on this interval (ms). Replaces the old hand-rolled poll. */
  refetchInterval?: number;
  /** Set false to hold the query (e.g. an id not chosen yet). Defaults to enabled. */
  enabled?: boolean;
}

/**
 * The {@link QueryClient} for the dashboard, with defaults tuned for a live ops view:
 * short stale time (data is always moving), no refetch-on-focus (the poll already covers it).
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 5_000, refetchOnWindowFocus: false },
    },
  });
}
