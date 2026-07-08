import { Hono } from "hono";
import type { SystemService } from "../services/system-service";

/** Route for system/engine info, mounted under `/api/system`. */
export const systemRoutes = (system: SystemService) => new Hono().get("/", async (c) => c.json(await system.info()));
