import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, renderHook } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import type { ApiClient } from "../client";
import { ApiClientProvider } from "../context";

/** A stand-in for a `fetch` Response whose `.json()` resolves to `body`. */
export function jsonResponse<T>(body: T) {
  return { json: () => Promise.resolve(body) };
}

/**
 * A wrapper supplying a fake API client and a fresh QueryClient through context. Retries are off
 * so a rejected query/mutation surfaces its error at once instead of backing off.
 */
function withClient(client: ApiClient) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <ApiClientProvider value={client}>{children}</ApiClientProvider>
    </QueryClientProvider>
  );
}

/** Renders a hook with a fake API client supplied through context. */
export function renderHookWithClient<R>(hook: () => R, client: ApiClient) {
  return renderHook(hook, { wrapper: withClient(client) });
}

/** Renders a component tree with a fake API client supplied through context. */
export function renderWithClient(ui: ReactElement, client: ApiClient) {
  return render(ui, { wrapper: withClient(client) });
}
