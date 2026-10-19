import ejs from "ejs";
import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { describe, expect, it, vi } from "vitest";
import { SidequestDashboard } from "./index";

const views = path.join(import.meta.dirname, "views");

function render(page: string, pollingInterval?: number) {
  return ejs.renderFile(path.join(views, page), {
    basePath: "",
    pollingInterval,
    stats: { running: 0, completed: 0, failed: 0, waiting: 0 },
    queues: [],
    jobs: [],
    job: { id: 1, class: "Example", state: "waiting", available_at: new Date(0), errors: [] },
    filters: { status: "", time: "", queue: "", class: "", start: "", end: "" },
    pagination: { page: 1, hasNextPage: false },
  });
}

describe("dashboard polling", () => {
  it.each([-1, 1.5, NaN, Infinity])("rejects invalid interval %s", async (interval) => {
    await expect(new SidequestDashboard().start({ pollingInterval: interval })).rejects.toThrow(
      "pollingInterval must be a non-negative integer",
    );
  });

  it.each([
    [undefined, "every 1000ms", "every 3000ms", false],
    [10000, "every 10000ms", "every 10000ms", false],
    [0, "refresh from:body", "jobChanged", true],
  ])("renders interval %s across the dashboard", async (interval, statsTrigger, jobTrigger, manual) => {
    const [dashboard, jobs, queues, job] = await Promise.all([
      render("pages/index.ejs", interval),
      render("pages/jobs.ejs", interval),
      render("pages/queues.ejs", interval),
      render("pages/job.ejs", interval),
    ]);

    expect(dashboard).toContain(`hx-trigger="${statsTrigger}`);
    expect(dashboard).toContain(`SIDEQUEST_POLLING_INTERVAL = ${interval ?? "null"}`);
    expect(jobs).toContain(`hx-trigger="change from:* delay:300ms, ${jobTrigger}`);
    expect(queues).toContain(
      interval === 0 ? 'hx-trigger="toggleQueue"' : `hx-trigger="every ${interval ?? 3000}ms, toggleQueue"`,
    );
    expect(job).toContain(`hx-trigger="${interval === 0 ? "jobChanged" : `every ${interval ?? 3000}ms, jobChanged`}"`);
    for (const page of [dashboard, jobs, queues, job]) {
      expect(page.includes(">Refresh</button>")).toBe(manual);
    }
  });

  it.each([undefined, 10000, 0])("schedules graph refresh for interval %s", (interval) => {
    const source = readFileSync(path.join(import.meta.dirname, "public/js/dashboard.js"), "utf8");
    const setInterval = vi.fn();
    const addEventListener = vi.fn();
    const chart = { data: { labels: [], datasets: [{ data: [] }, { data: [] }] }, update: vi.fn() };
    vm.runInNewContext(source, {
      window: { SIDEQUEST_POLLING_INTERVAL: interval },
      document: { getElementById: () => ({ getContext: () => ({}), addEventListener }) },
      Chart: function () {
        return chart;
      },
      fetch: () => Promise.resolve({ json: () => Promise.resolve([]) }),
      htmx: { trigger: vi.fn() },
      setInterval,
      Date,
    });

    if (interval === 0) {
      expect(setInterval).not.toHaveBeenCalled();
    } else {
      expect(setInterval).toHaveBeenCalledWith(expect.any(Function), interval ?? 1000);
    }
  });
});
