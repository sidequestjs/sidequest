import { JobsPage } from "./pages/jobs";
import { OverviewPage } from "./pages/overview";
import { QueuesPage } from "./pages/queues";
import type { DashboardPage } from "./shell";

/** The OSS dashboard pages. The Pro spreads these and appends its own before mounting the shell. */
export const ossPages: DashboardPage[] = [
  { path: "/", nav: { label: "Overview", icon: "layout-dashboard" }, element: <OverviewPage /> },
  { path: "/jobs", nav: { label: "Jobs", icon: "list" }, element: <JobsPage /> },
  { path: "/queues", nav: { label: "Queues", icon: "layers" }, element: <QueuesPage /> },
];
