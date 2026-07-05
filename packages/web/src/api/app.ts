import type { Backend } from "@sidequest/backend";
import { type ErrorHandler, Hono } from "hono";
import { NotFoundError } from "./errors";
import { jobsRoutes } from "./routes/jobs";
import { overviewRoutes } from "./routes/overview";
import { queuesRoutes } from "./routes/queues";
import { systemRoutes } from "./routes/system";
import { JobService } from "./services/job-service";
import { OverviewService } from "./services/overview-service";
import { QueueService } from "./services/queue-service";
import { SystemService } from "./services/system-service";

/** Maps API errors to JSON responses: {@link NotFoundError} to 404, anything else to 500. */
export const apiErrorHandler: ErrorHandler = (err, c) => {
  if (err instanceof NotFoundError) return c.json({ error: err.message }, 404);
  return c.json({ error: "Internal server error" }, 500);
};

/** Dependencies the API needs. */
export interface ApiDeps {
  backend: Backend;
  /** Sidequest version shown in the dashboard sidebar (the backend doesn't expose it). */
  version?: string;
  /** Backend driver name shown in the dashboard sidebar (lives in the backend config). */
  driver?: string;
}

/**
 * Builds the OSS management API tree, mounted at `/api` by the server. Paths are relative
 * so the same front-end works against the OSS server and the Pro superset.
 *
 * The Pro composes its own tree by reusing the exported route factories with superset
 * services, adding routes, or overriding a service. It never forks this function.
 */
export function createApiApp(deps: ApiDeps) {
  return new Hono()
    .route("/jobs", jobsRoutes(new JobService(deps.backend)))
    .route("/queues", queuesRoutes(new QueueService(deps.backend)))
    .route("/overview", overviewRoutes(new OverviewService(deps.backend)))
    .route("/system", systemRoutes(new SystemService(deps.backend, { version: deps.version, driver: deps.driver })))
    .onError(apiErrorHandler);
}

/** The assembled API type, for the Hono RPC client: `hc<ApiApp>(...)`. */
export type ApiApp = ReturnType<typeof createApiApp>;
