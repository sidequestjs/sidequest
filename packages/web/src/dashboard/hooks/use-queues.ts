import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { useApiClient } from "../context";
import type { QueryHookOptions } from "./query-client";

/** Queries the queues list, each annotated with its job counts. */
export function useQueues(options?: QueryHookOptions) {
  const client = useApiClient();
  return useQuery({
    queryKey: ["queues"],
    queryFn: async () => {
      const res = await client.queues.$get();
      return res.json();
    },
    refetchInterval: options?.refetchInterval,
    enabled: options?.enabled,
  });
}

/**
 * Queue mutations. Posts a toggle and, on success, invalidates the queues query so the list
 * refetches on its own. The call shape stays `{ toggle }` so callers do not change.
 */
export function useQueueActions() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  const { mutateAsync } = useMutation({
    mutationFn: (name: string) => client.queues[":name"].toggle.$post({ param: { name } }).then((res) => res.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["queues"] }),
  });
  return useMemo(() => ({ toggle: (name: string) => mutateAsync(name) }), [mutateAsync]);
}
