import { Hono } from "hono";
import type { QueueService } from "../services/queue-service";

/** Routes for queues, mounted under `/api/queues`. */
export const queuesRoutes = (queues: QueueService) =>
  new Hono()
    .get("/", async (c) => c.json(await queues.list()))
    .post("/:name/toggle", async (c) => c.json(await queues.toggle(c.req.param("name"))));
