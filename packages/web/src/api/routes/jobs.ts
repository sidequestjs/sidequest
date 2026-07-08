import { Hono } from "hono";
import { parseJobQuery } from "../filters";
import type { JobService } from "../services/job-service";

/**
 * Routes for jobs, mounted under `/api/jobs`. Built by chaining so the Hono RPC client
 * (`hc`) can infer the types. The Pro reuses this factory with a superset service.
 */
export const jobsRoutes = (jobs: JobService) =>
  new Hono()
    .get("/", async (c) => {
      const { filters, page, pageSize } = parseJobQuery(c);
      const offset = (page - 1) * pageSize;
      // A one-row probe at the next offset tells us whether another page exists.
      const [list, next] = await Promise.all([
        jobs.list({ ...filters, limit: pageSize, offset }),
        jobs.list({ ...filters, limit: 1, offset: page * pageSize }),
      ]);
      return c.json({ jobs: list, pagination: { page, pageSize, hasNextPage: next.length > 0 } });
    })
    // Registered before "/:id" so it is not captured as an id.
    .get("/meta", async (c) => c.json({ queues: await jobs.queueNames() }))
    .get("/:id", async (c) => {
      const job = await jobs.get(Number(c.req.param("id")));
      if (!job) return c.json({ error: "Job not found" }, 404);
      return c.json(job);
    })
    .post("/:id/run", async (c) => c.json(await jobs.run(Number(c.req.param("id")))))
    .post("/:id/cancel", async (c) => c.json(await jobs.cancel(Number(c.req.param("id")))))
    .post("/:id/rerun", async (c) => c.json(await jobs.rerun(Number(c.req.param("id")))));
