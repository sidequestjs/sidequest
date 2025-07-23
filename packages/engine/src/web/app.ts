import express from "express";
import expressLayouts from "express-ejs-layouts";
import path from "node:path";
import { Sidequest } from "../sidequest";

export function runWeb(port: number = 8678) {
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
    const backend = Sidequest.getBackend();

    const filters: {
      queue?: string;
      state?: string;
      sinceId?: number;
      limit: number;
      class?: string;
      timeRange?: {
        from?: Date;
        to?: Date;
      };
    } = {
      limit: 20,
      queue: typeof queue === "string" && queue.trim() !== "" ? queue : undefined,
      class: typeof klass === "string" && klass.trim() !== "" ? klass : undefined,
      state: typeof status === "string" && status.trim() !== "" ? status : undefined,
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
        status: status || "",
        time: time || "",
        start: start || "",
        end: end || "",
        queue: queue || "",
        class: klass || "",
      },
    });
  });

  app.get("/queues", async (req, res) => {
    const backend = Sidequest.getBackend();
    const queues = await backend.listQueues();

    res.render("pages/queues", {
      title: "Queues",
      queues,
    });
  });

  app.listen(port, () => console.log(`Server running on http://localhost:${port}`));
}
