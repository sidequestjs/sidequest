import { useApiClient } from "../context";
import { toQuery } from "./to-query";
import { useApiQuery, type UseApiQueryOptions } from "./use-api-query";

/** Queries the overview counts for a range (`12m` | `12h` | `12d`). */
export function useOverview(range?: string, options?: UseApiQueryOptions) {
  const client = useApiClient();
  return useApiQuery(
    async () => {
      const res = await client.overview.$get({ query: toQuery({ range }) });
      return res.json();
    },
    [range],
    options,
  );
}

/** Queries the overview time series for a range, for the chart. */
export function useOverviewTimeseries(range?: string, options?: UseApiQueryOptions) {
  const client = useApiClient();
  return useApiQuery(
    async () => {
      const res = await client.overview.timeseries.$get({ query: toQuery({ range }) });
      return res.json();
    },
    [range],
    options,
  );
}
