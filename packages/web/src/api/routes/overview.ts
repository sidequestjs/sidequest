import { Hono } from "hono";
import type { OverviewService } from "../services/overview-service";

/** Routes for the overview home, mounted under `/api/overview`. */
export const overviewRoutes = (overview: OverviewService) =>
  new Hono()
    .get("/", async (c) => c.json(await overview.counts(c.req.query("range"))))
    .get("/timeseries", async (c) => c.json(await overview.timeseries(c.req.query("range"))));
