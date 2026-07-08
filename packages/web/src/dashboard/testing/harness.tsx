import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import type { ApiClient } from "../client";
import { ApiClientProvider } from "../context";

/** A stand-in for a `fetch` Response whose `.json()` resolves to `body`. */
export function jsonResponse<T>(body: T) {
  return { json: () => Promise.resolve(body) };
}

/**
 * Renders a hook with a fake API client and a fresh QueryClient supplied through context.
 * Retries are off so a rejected query/mutation surfaces its error at once instead of backing off.
 */
export function renderHookWithClient<R>(hook: () => R, client: ApiClient) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <ApiClientProvider value={client}>{children}</ApiClientProvider>
    </QueryClientProvider>
  );
  return renderHook(hook, { wrapper });
}
