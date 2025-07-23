import { JobData } from "@sidequest/core";
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

function getJobsStatistics(jobs: JobData[], range: string | undefined) {
  const now = Date.now();

  const rangeMs = rangeToMs(range);

  const filteredJobs = jobs.filter((job) => {
    let time: Date = new Date(0);

    switch (job.state) {
      case "completed":
        time = job.completed_at!;
        break;
      case "failed":
        time = job.failed_at!;
        break;
      case "waiting":
        time = job.inserted_at!;
        break;
      case "running":
        time = job.attempted_at!;
        break;
    }

    return time.getTime() >= now - rangeMs;
  });

  let completedJobs = 0;
  let failedJobs = 0;
  let waitingJobs = 0;
  let runningJobs = 0;

  filteredJobs.forEach((job) => {
    switch (job.state) {
      case "completed":
        completedJobs++;
        break;
      case "failed":
        failedJobs++;
        break;
      case "waiting":
        waitingJobs++;
        break;
      case "running":
        runningJobs++;
        break;
    }
  });

  return {
    completedJobs,
    failedJobs,
    waitingJobs,
    runningJobs,
  };
}

function truncateToBucket(date: Date, bucketSizeMs: number): number {
  return Math.floor(date.getTime() / bucketSizeMs) * bucketSizeMs;
}

function getGraphData(jobs: JobData[], range: string) {
  const now = new Date();

  const bucketCount = 12;
  let bucketSizeMs: number;

  switch (range) {
    case "12h":
      bucketSizeMs = 60 * 60 * 1000; // 1 hour
      break;
    case "12d":
      bucketSizeMs = 24 * 60 * 60 * 1000; // 1 day
      break;
    case "12m":
    default:
      bucketSizeMs = 60 * 1000; // 1 minute
      break;
  }

  const nowTruncated = truncateToBucket(now, bucketSizeMs);

  const buckets: number[] = [];
  const completedMap = new Map<number, number>();
  const failedMap = new Map<number, number>();

  for (let i = bucketCount - 1; i >= 0; i--) {
    const bucketTime = nowTruncated - i * bucketSizeMs;
    buckets.push(bucketTime);
    completedMap.set(bucketTime, 0);
    failedMap.set(bucketTime, 0);
  }

  for (const job of jobs) {
    if (job.completed_at) {
      const completedTime = truncateToBucket(job.completed_at, bucketSizeMs);
      if (completedMap.has(completedTime)) {
        completedMap.set(completedTime, completedMap.get(completedTime)! + 1);
      }
    }

    if (job.failed_at) {
      const failedTime = truncateToBucket(job.failed_at, bucketSizeMs);
      if (failedMap.has(failedTime)) {
        failedMap.set(failedTime, failedMap.get(failedTime)! + 1);
      }
    }
  }

  const completed: number[] = [];
  const failed: number[] = [];

  for (const bucket of buckets) {
    completed.push(completedMap.get(bucket) ?? 0);
    failed.push(failedMap.get(bucket) ?? 0);
  }

  return { completed, failed };
}

dashboardRouter.get("/", async (req, res) => {
  const { range = "12m" } = req.query;

  const backend = getBackend();
  const jobs = await backend.listJobs();

  const stats = getJobsStatistics(jobs, range as string);

  res.render("pages/index", {
    title: "Sidequest Dashboard",
    stats,
  });
});

dashboardRouter.get("/dashboard/stats", async (req, res) => {
  const { range = "12m" } = req.query;

  const backend = getBackend();
  const jobs = await backend.listJobs();

  const stats = getJobsStatistics(jobs, range as string);

  res.render("partials/dashboard-stats", {
    stats,
    layout: false,
  });
});

dashboardRouter.get("/dashboard/graph-data", async (req, res) => {
  const { range = "12m" } = req.query;

  const backend = getBackend();
  const jobs = await backend.listJobs();

  const graph = getGraphData(jobs, range as string);

  res.json(graph).end();
});

export default dashboardRouter;
