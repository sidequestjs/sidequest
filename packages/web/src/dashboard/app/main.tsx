import { createRoot } from "react-dom/client";
import { createApiClient } from "../client";
import "../../ui/styles.css";
import "../dashboard.css";
import { DashboardApp } from "./app";

// The façade injects the base path the dashboard is served under (default "/"); the
// management API lives at `<base>/api`, so point the client there.
const base = window.__SQ_DASHBOARD_BASE__ ?? "/";
const apiBase = `${base.replace(/\/$/, "")}/api`;

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(<DashboardApp client={createApiClient(apiBase)} />);
}
