import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "../context";
import type { QueryHookOptions } from "./query-client";
import { toQuery } from "./to-query";

/** Queries the overview counts for a range (`12m` | `12h` | `12d`). */
export function useOverview(range?: string, options?: QueryHookOptions) {
  const client = useApiClient();
  return useQuery({
    queryKey: ["overview", "counts", range],
    queryFn: async () => {
      const res = await client.overview.$get({ query: toQuery({ range }) });
      return res.json();
    },
    refetchInterval: options?.refetchInterval,
    enabled: options?.enabled,
  });
}

/** Queries the overview time series for a range, for the chart. */
export function useOverviewTimeseries(range?: string, options?: QueryHookOptions) {
  const client = useApiClient();
  return useQuery({
    queryKey: ["overview", "timeseries", range],
    queryFn: async () => {
      const res = await client.overview.timeseries.$get({ query: toQuery({ range }) });
      return res.json();
    },
    refetchInterval: options?.refetchInterval,
    enabled: options?.enabled,
  });
}
