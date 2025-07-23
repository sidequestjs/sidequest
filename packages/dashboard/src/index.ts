import { JobState, logger } from "@sidequest/core";
import { Engine } from "@sidequest/engine";
import express from "express";
import expressLayouts from "express-ejs-layouts";
import path from "node:path";
import { DashboardConfig } from "./config";

export class SidequestDashboard {
  static start(config?: DashboardConfig) {
    const enabled = config?.enabled ?? true;
    if (!enabled) return;

    const app = express();

    app.use(expressLayouts);
    app.set("view engine", "ejs");
    app.set("views", path.join(import.meta.dirname, "views"));
    app.set("layout", path.join(import.meta.dirname, "views", "layout"));

    app.use("/public", express.static(path.join(import.meta.dirname, "public")));

    app.get("/", function (req, res) {
      res.render("pages/index", { title: "Sidequest Dashboard" });
    });

    app.get("/jobs", async (req, res) => {
      const { status, time, start, end, sinceId, queue, class: klass } = req.query;
      const backend = Engine.getBackend();

      const filters: {
        queue?: string;
        jobClass?: string;
        state?: JobState;
        sinceId?: number;
        limit?: number;
        args?: unknown;
        timeRange?: {
          from?: Date;
          to?: Date;
        };
      } = {
        limit: 20,
        queue: typeof queue === "string" && queue.trim() !== "" ? queue : undefined,
        jobClass: typeof klass === "string" && klass.trim() !== "" ? klass : undefined,
        state: status as JobState,
        sinceId: sinceId ? parseInt(sinceId as string, 10) : undefined,
      };

      if (time === "15m") {
        filters.timeRange = { from: new Date(Date.now() - 15 * 60 * 1000) };
      } else if (time === "1d") {
        filters.timeRange = { from: new Date(Date.now() - 24 * 60 * 60 * 1000) };
      } else if (time === "custom" && typeof start === "string" && typeof end === "string") {
        filters.timeRange = {
          from: new Date(start),
          to: new Date(end),
        };
      }

      const jobs = await backend.listJobs(filters);

      res.render("pages/jobs", {
        title: "Jobs",
        jobs,
        filters: {
          status: status ?? "",
          time: time ?? "",
          start: start ?? "",
          end: end ?? "",
          queue: queue ?? "",
          class: klass ?? "",
        },
      });
    });

    app.get("/queues", async (req, res) => {
      const backend = Engine.getBackend();
      const queues = await backend.listQueues();

      res.render("pages/queues", {
        title: "Queues",
        queues,
      });
    });

    const port = config?.port ?? 8678;
    app.listen(port, () => logger().info(`Server running on http://localhost:${port}`));
  }
}

export * from "./config";
