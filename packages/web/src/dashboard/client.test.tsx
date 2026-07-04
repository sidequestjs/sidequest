import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { createApiClient } from "./client";
import { ApiClientProvider, useApiClient } from "./context";

describe("createApiClient", () => {
  it("exposes the api resource accessors", () => {
    const client = createApiClient();
    expect(client.jobs).toBeDefined();
    expect(client.queues).toBeDefined();
    expect(client.overview).toBeDefined();
  });
});

describe("useApiClient", () => {
  it("returns the client from the provider", () => {
    const custom = createApiClient("/base");
    const wrapper = ({ children }: { children: ReactNode }) => (
      <ApiClientProvider value={custom}>{children}</ApiClientProvider>
    );
    const { result } = renderHook(() => useApiClient(), { wrapper });
    expect(result.current).toBe(custom);
  });

  it("defaults to a same-origin client without a provider", () => {
    const { result } = renderHook(() => useApiClient());
    expect(result.current.jobs).toBeDefined();
  });
});
