import { QueryClientProvider } from "@tanstack/react-query";
import { useMemo } from "react";
import { type ApiClient, createApiClient } from "../client";
import { ApiClientProvider } from "../context";
import { createQueryClient } from "../hooks/query-client";
import { ossPages } from "./pages";
import { DashboardShell } from "./shell";

/**
 * The OSS dashboard app: wires the API client and the QueryClient into context and mounts the
 * shell with the OSS pages. Pass `client` to point it at a custom base URL (or a Pro superset
 * client).
 */
export function DashboardApp({ client }: { client?: ApiClient }) {
  const resolved = useMemo(() => client ?? createApiClient(), [client]);
  const queryClient = useMemo(() => createQueryClient(), []);
  return (
    <QueryClientProvider client={queryClient}>
      <ApiClientProvider value={resolved}>
        <DashboardShell pages={ossPages} />
      </ApiClientProvider>
    </QueryClientProvider>
  );
}
