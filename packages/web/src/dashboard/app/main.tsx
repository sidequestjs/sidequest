import { createRoot } from "react-dom/client";
import "../../ui/styles.css";
import { DashboardApp } from "./app";

const root = document.getElementById("root");
if (root) createRoot(root).render(<DashboardApp />);
