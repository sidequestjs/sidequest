import { useMemo } from "react";
import { useApiClient } from "../context";
import { toQuery } from "./to-query";
import { useApiQuery, type UseApiQueryOptions } from "./use-api-query";

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
export function useJobs(filters: JobsFilter = {}, options?: UseApiQueryOptions) {
  const client = useApiClient();
  return useApiQuery(
    async () => {
      const res = await client.jobs.$get({ query: toQuery(filters) });
      return res.json();
    },
    [JSON.stringify(filters)],
    options,
  );
}

/** Queries a single job by id. */
export function useJob(id: number, options?: UseApiQueryOptions) {
  const client = useApiClient();
  return useApiQuery(
    async () => {
      const res = await client.jobs[":id"].$get({ param: { id: String(id) } });
      return res.json();
    },
    [id],
    options,
  );
}

/** Queries the distinct queue names that appear on jobs (for the filter dropdown). */
export function useJobsMeta(options?: UseApiQueryOptions) {
  const client = useApiClient();
  return useApiQuery(
    async () => {
      const res = await client.jobs.meta.$get();
      return res.json();
    },
    [],
    options,
  );
}

/** Job mutations. Each returns the updated job; callers refetch the affected queries. */
export function useJobActions() {
  const client = useApiClient();
  return useMemo(() => {
    const post = (id: number, action: "run" | "cancel" | "rerun") =>
      client.jobs[":id"][action].$post({ param: { id: String(id) } }).then((res) => res.json());
    return {
      run: (id: number) => post(id, "run"),
      cancel: (id: number) => post(id, "cancel"),
      rerun: (id: number) => post(id, "rerun"),
    };
  }, [client]);
}
