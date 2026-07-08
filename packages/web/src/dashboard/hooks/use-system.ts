import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "../context";
import type { QueryHookOptions } from "./query-client";

/** Queries system/engine info (driver, version, connectivity) for the sidebar footer. */
export function useSystem(options?: QueryHookOptions) {
  const client = useApiClient();
  return useQuery({
    queryKey: ["system"],
    queryFn: async () => {
      const res = await client.system.$get();
      return res.json();
    },
    refetchInterval: options?.refetchInterval,
    enabled: options?.enabled,
  });
}
