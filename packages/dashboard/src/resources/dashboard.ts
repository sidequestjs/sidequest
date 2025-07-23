import { Router } from "express";
import { getBackend } from "../backend-driver";

const dashboardRouter = Router();

function rangeToMs(range: string | undefined) {
  let rangeMs: number;
  switch (range) {
    case "12h":
      rangeMs = 12 * 60 * 60 * 1000;
      break;
    case "12d":
      rangeMs = 12 * 24 * 60 * 60 * 1000;
      break;
    case "12m":
    default:
      // Defaults to 12m
      rangeMs = 12 * 60 * 1000;
      break;
  }

  return rangeMs;
}

dashboardRouter.get("/", async (req, res) => {
  const { range = "12m" } = req.query;
  const from = new Date(Date.now() - rangeToMs(range as string));
  const backend = getBackend();
  const jobs = await backend.countJobs({ from });

  res.render("pages/index", {
    title: "Sidequest Dashboard",
    stats: jobs,
  });
});

dashboardRouter.get("/dashboard/stats", async (req, res) => {
  const { range = "12m" } = req.query;
  const from = new Date(Date.now() - rangeToMs(range as string));
  const backend = getBackend();
  const jobs = await backend.countJobs({ from });

  res.render("partials/dashboard-stats", {
    stats: jobs,
    layout: false,
  });
});

dashboardRouter.get("/dashboard/graph-data", async (req, res) => {
  const { range = "12m" } = req.query;

  const backend = getBackend();
  const jobs = await backend.countJobsOverTime(range as string);

  res.json(jobs).end();
});

export default dashboardRouter;
