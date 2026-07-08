import { createContext, useContext } from "react";
import { type ApiClient, createApiClient } from "./client";

const ApiClientContext = createContext<ApiClient>(createApiClient());

/** Provides the {@link ApiClient} to the dashboard hooks. The Pro passes its superset client. */
export const ApiClientProvider = ApiClientContext.Provider;

/** The {@link ApiClient} from context, defaulting to a same-origin client. */
export function useApiClient(): ApiClient {
  return useContext(ApiClientContext);
}
