import { useMemo } from "react";
import { type ApiClient, createApiClient } from "../client";
import { ApiClientProvider } from "../context";
import { ossPages } from "./pages";
import { DashboardShell } from "./shell";

/**
 * The OSS dashboard app: wires the API client into context and mounts the shell with the OSS
 * pages. Pass `client` to point it at a custom base URL (or a Pro superset client).
 */
export function DashboardApp({ client }: { client?: ApiClient }) {
  const resolved = useMemo(() => client ?? createApiClient(), [client]);
  return (
    <ApiClientProvider value={resolved}>
      <DashboardShell pages={ossPages} />
    </ApiClientProvider>
  );
}
