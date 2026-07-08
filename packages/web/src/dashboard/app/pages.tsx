import { JobDetailPage, JobsPage } from "./pages/jobs";
import { OverviewPage } from "./pages/overview";
import { QueuesPage } from "./pages/queues";
import type { DashboardPage } from "./shell";

/** The OSS dashboard pages. The Pro spreads these and appends its own before mounting the shell. */
export const ossPages: DashboardPage[] = [
  {
    path: "/",
    nav: {
      label: "Overview",
      icon: "LayoutDashboard",
      section: "Monitor",
      hint: "G O",
      subtitle: "Real-time job processing at a glance",
    },
    element: <OverviewPage />,
  },
  {
    path: "/jobs",
    nav: {
      label: "Jobs",
      icon: "List",
      section: "Monitor",
      hint: "G J",
      subtitle: "Inspect, filter, and reprocess background jobs",
    },
    element: <JobsPage />,
    routes: [{ path: "/jobs/$id", element: <JobDetailPage /> }],
  },
  {
    path: "/queues",
    nav: {
      label: "Queues",
      icon: "Layers",
      section: "Monitor",
      hint: "G Q",
      subtitle: "Concurrency, priority, and throughput per queue",
    },
    element: <QueuesPage />,
  },
];
