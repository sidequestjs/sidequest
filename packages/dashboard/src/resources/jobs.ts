import { Backend } from "@sidequest/backend";
import { JobState } from "@sidequest/core";
import { Router } from "express";

export function createJobsRouter(backend: Backend) {
  const jobsRouter = Router();

  jobsRouter.get("/", async (req, res) => {
    const { status, start, end, queue, class: jobClass } = req.query;

    const time = typeof req.query.time === "string" && req.query.time.trim() ? req.query.time : "any";

    const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : 30;
    const page = req.query.page ? Math.max(parseInt(req.query.page as string, 10), 1) : 1;
    const offset = (page - 1) * pageSize;

    const filters: {
      queue?: string;
      jobClass?: string;
      state?: JobState;
      limit?: number;
      offset?: number;
      args?: unknown[];
      timeRange?: {
        from?: Date;
        to?: Date;
      };
    } = {
      limit: pageSize,
      offset: offset,
      queue: typeof queue === "string" && queue.trim() ? queue : undefined,
      jobClass: typeof jobClass === "string" && jobClass.trim() ? jobClass : undefined,
      state: status as JobState,
    };

    filters.timeRange = computeTimeRange(time, start, end);

    const timeRangeStrings = filters.timeRange
      ? {
          from: filters.timeRange.from!.toISOString(),
          to: (filters.timeRange.to ?? new Date()).toISOString(),
        }
      : undefined;

    const [jobs, queues, nextPageJobs] = await Promise.all([
      backend?.listJobs(filters),
      backend?.getQueuesFromJobs(),
      backend?.listJobs({ ...filters, limit: 1, offset: page * pageSize }),
    ]);

    const isHtmx = req.get("hx-request");

    if (isHtmx) {
      res.render("partials/jobs-table", {
        jobs,
        pagination: {
          page,
          pageSize,
          hasNextPage: nextPageJobs.length > 0,
        },
        layout: false,
      });
    } else {
      res.render("pages/jobs", {
        title: "Jobs",
        jobs,
        queues,
        filters: {
          status: status ?? "",
          time: time ?? "",
          queue: queue ?? "",
          class: jobClass ?? "",
          start: start ?? timeRangeStrings?.from ?? "",
          end: end ?? timeRangeStrings?.to ?? "",
        },
        pagination: {
          page,
          pageSize,
          hasNextPage: nextPageJobs.length > 0,
        },
      });
    }
  });

  jobsRouter.get("/:id", async (req, res) => {
    const jobId = parseInt(req.params.id);
    const job = await backend?.getJob(jobId);

    const isHtmx = req.get("hx-request");

    if (job) {
      if (isHtmx) {
        res.render("partials/job-view", {
          title: `Job #${job.id}`,
          job,
          layout: false,
        });
      } else {
        res.render("pages/job", {
          title: `Job #${job.id}`,
          job,
        });
      }
    } else {
      res.status(404).send("Job not found!");
    }
  });

  jobsRouter.patch("/:id/run", async (req, res) => {
    const jobId = parseInt(req.params.id);
    const job = await backend?.getJob(jobId);

    if (job) {
      await backend.updateJob({ id: job.id, available_at: new Date() });
      res.header("HX-Trigger", "jobChanged").status(200).end();
    } else {
      res.status(404).end();
    }
  });

  jobsRouter.patch("/:id/cancel", async (req, res) => {
    const jobId = parseInt(req.params.id);
    const job = await backend?.getJob(jobId);

    if (job) {
      await backend.updateJob({ ...job, state: "canceled" });
      res.header("HX-Trigger", "jobChanged").status(200).end();
    } else {
      res.status(404).end();
    }
  });

  jobsRouter.patch("/:id/rerun", async (req, res) => {
    const jobId = parseInt(req.params.id);
    const job = await backend?.getJob(jobId);

    if (job) {
      const maxAttempts = job.max_attempts === job.attempt ? job.max_attempts + 1 : job.max_attempts;
      await backend.updateJob({ ...job, state: "waiting", max_attempts: maxAttempts });
      res.header("HX-Trigger", "jobChanged").status(200).end();
    } else {
      res.status(404).end();
    }
  });

  function computeTimeRange(time?: unknown, start?: unknown, end?: unknown) {
    if (typeof time !== "string") return undefined;

    const now = Date.now();

    const minutesMap: Record<string, number> = {
      "5m": 5,
      "15m": 15,
      "30m": 30,
      "1h": 60,
      "4h": 240,
      "12h": 720,
      "24h": 1440,
      "2d": 2880,
      "7d": 10080,
      "30d": 43200,
    };

    if (minutesMap[time]) {
      return { from: new Date(now - minutesMap[time] * 60_000) };
    }

    if (time === "custom" && typeof start === "string" && typeof end === "string") {
      const fromDate = new Date(start);
      const toDate = new Date(end);
      if (!isNaN(fromDate.getTime()) && !isNaN(toDate.getTime())) {
        return { from: fromDate, to: toDate };
      }
    }

    return undefined;
  }

  return ["/jobs", jobsRouter] as const;
}
