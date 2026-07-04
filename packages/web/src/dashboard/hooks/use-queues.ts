import { useMemo } from "react";
import { useApiClient } from "../context";
import { useApiQuery, type UseApiQueryOptions } from "./use-api-query";

/** Queries the queues list, each annotated with its job counts. */
export function useQueues(options?: UseApiQueryOptions) {
  const client = useApiClient();
  return useApiQuery(
    async () => {
      const res = await client.queues.$get();
      return res.json();
    },
    [],
    options,
  );
}

/** Queue mutations. Returns the updated queue; callers refetch the queues query. */
export function useQueueActions() {
  const client = useApiClient();
  return useMemo(
    () => ({
      toggle: (name: string) => client.queues[":name"].toggle.$post({ param: { name } }).then((res) => res.json()),
    }),
    [client],
  );
}
