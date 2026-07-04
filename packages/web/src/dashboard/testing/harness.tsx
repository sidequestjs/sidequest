import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import type { ApiClient } from "../client";
import { ApiClientProvider } from "../context";

/** A stand-in for a `fetch` Response whose `.json()` resolves to `body`. */
export function jsonResponse<T>(body: T) {
  return { json: () => Promise.resolve(body) };
}

/** Renders a hook with a fake API client supplied through context. */
export function renderHookWithClient<R>(hook: () => R, client: ApiClient) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <ApiClientProvider value={client}>{children}</ApiClientProvider>
  );
  return renderHook(hook, { wrapper });
}
