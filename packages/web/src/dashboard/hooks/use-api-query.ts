/* eslint-disable react-hooks/set-state-in-effect --
   this is the single, deliberate data-fetching primitive: its effect subscribes to the API
   endpoint and sets state as results arrive. every other hook builds on it and never fetches
   this way, so the pattern is contained here on purpose. */
import { useCallback, useEffect, useRef, useState } from "react";

/** The state a query hook exposes. */
export interface QueryState<T> {
  /** The last successfully fetched value, or `undefined` before the first success. */
  data: T | undefined;
  /** The last error, cleared on the next attempt. */
  error: Error | undefined;
  /** True while a fetch is in flight. */
  isLoading: boolean;
  /** Triggers a fresh fetch, keeping the current data until it resolves. */
  refetch: () => void;
}

/** Options for {@link useApiQuery}. */
export interface UseApiQueryOptions {
  /** If set, re-fetch on this interval (ms). Cleared on unmount. */
  refetchInterval?: number;
}

/**
 * Minimal data-fetching primitive: runs `fetcher` on mount, whenever `deps` change, and on
 * `refetch()`. A monotonic request id guards against races so a slow, stale response can
 * never overwrite a newer one. No caching or dedup, by design; the API surface is small.
 */
export function useApiQuery<T>(fetcher: () => Promise<T>, deps: unknown[], options?: UseApiQueryOptions): QueryState<T> {
  const [state, setState] = useState<{ data?: T; error?: Error; isLoading: boolean }>({ isLoading: true });

  // Keep the latest fetcher in a ref (updated in an effect, never during render) so the run
  // callback can stay stable without capturing a stale closure.
  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  // Monotonic id: only the most recent request may write state.
  const requestId = useRef(0);

  const run = useCallback(() => {
    const id = ++requestId.current;
    setState((prev) => ({ ...prev, isLoading: true, error: undefined }));
    fetcherRef.current().then(
      (data) => {
        if (id === requestId.current) setState({ data, isLoading: false });
      },
      (error: unknown) => {
        if (id === requestId.current) setState({ error: error as Error, isLoading: false });
      },
    );
  }, []);

  useEffect(() => {
    run();
    if (options?.refetchInterval) {
      const timer = setInterval(run, options.refetchInterval);
      return () => clearInterval(timer);
    }
    // deps are the caller's cache key; run/refetchInterval are stable enough to omit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data: state.data, error: state.error, isLoading: state.isLoading, refetch: run };
}
