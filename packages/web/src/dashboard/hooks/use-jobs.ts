import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { useApiClient } from "../context";
import type { QueryHookOptions } from "./query-client";
import { toQuery } from "./to-query";

/** The jobs list query, mirroring the API's query string. */
export interface JobsFilter {
  state?: string;
  queue?: string;
  class?: string;
  time?: string;
  start?: string;
  end?: string;
  page?: number;
  pageSize?: number;
}

/** Queries the jobs list (with pagination) for the given filter. */
export function useJobs(filters: JobsFilter = {}, options?: QueryHookOptions) {
  const client = useApiClient();
  return useQuery({
    queryKey: ["jobs", "list", filters],
    queryFn: async () => {
      const res = await client.jobs.$get({ query: toQuery(filters) });
      return res.json();
    },
    refetchInterval: options?.refetchInterval,
    enabled: options?.enabled,
  });
}

/** Queries a single job by id. */
export function useJob(id: number, options?: QueryHookOptions) {
  const client = useApiClient();
  return useQuery({
    queryKey: ["jobs", "detail", id],
    queryFn: async () => {
      const res = await client.jobs[":id"].$get({ param: { id: String(id) } });
      return res.json();
    },
    refetchInterval: options?.refetchInterval,
    enabled: options?.enabled,
  });
}

/** Queries the distinct queue names that appear on jobs (for the filter dropdown). */
export function useJobsMeta(options?: QueryHookOptions) {
  const client = useApiClient();
  return useQuery({
    queryKey: ["jobs", "meta"],
    queryFn: async () => {
      const res = await client.jobs.meta.$get();
      return res.json();
    },
    refetchInterval: options?.refetchInterval,
    enabled: options?.enabled,
  });
}

/**
 * Job mutations (run/cancel/rerun). Each posts and, on success, invalidates the jobs queries so
 * any mounted list/detail refetches on its own. The call shape stays `{ run, cancel, rerun }` so
 * callers do not change; the manual refetch they used to do is now redundant.
 */
export function useJobActions() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  const { mutateAsync } = useMutation({
    mutationFn: ({ id, action }: { id: number; action: "run" | "cancel" | "rerun" }) =>
      client.jobs[":id"][action].$post({ param: { id: String(id) } }).then((res) => res.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["jobs"] }),
  });
  return useMemo(
    () => ({
      run: (id: number) => mutateAsync({ id, action: "run" }),
      cancel: (id: number) => mutateAsync({ id, action: "cancel" }),
      rerun: (id: number) => mutateAsync({ id, action: "rerun" }),
    }),
    [mutateAsync],
  );
}
