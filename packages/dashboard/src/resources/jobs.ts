import { JobState } from "@sidequest/core";
import { Engine } from "@sidequest/engine";
import { Router } from "express";

const jobsRouter = Router();

jobsRouter.get("/", async (req, res) => {
  const { status, time, start, end, sinceId, queue, class: klass } = req.query;
  const backend = Engine.getBackend();

  const filters: {
    queue?: string;
    jobClass?: string;
    state?: JobState;
    sinceId?: number;
    limit?: number;
    args?: unknown[];
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

  const jobs = await backend?.listJobs(filters);

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

export default jobsRouter;
