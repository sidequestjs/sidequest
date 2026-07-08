import { hc } from "hono/client";
import type { ApiApp } from "../api/app";

/** The typed client for the Sidequest management API. */
export type ApiClient = ReturnType<typeof hc<ApiApp>>;

/**
 * Creates a typed client for the management API. Requests are relative to `baseUrl`
 * (default: same-origin root), so the same client hits the OSS server or a Pro superset
 * serving the same paths without any change.
 */
export function createApiClient(baseUrl = "/"): ApiClient {
  return hc<ApiApp>(baseUrl);
}
