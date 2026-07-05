import { useApiClient } from "../context";
import { useApiQuery, type UseApiQueryOptions } from "./use-api-query";

/** Queries system/engine info (driver, version, connectivity) for the sidebar footer. */
export function useSystem(options?: UseApiQueryOptions) {
  const client = useApiClient();
  return useApiQuery(
    async () => {
      const res = await client.system.$get();
      return res.json();
    },
    [],
    options,
  );
}
