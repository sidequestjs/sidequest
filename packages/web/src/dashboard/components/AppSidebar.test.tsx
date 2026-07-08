import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ApiClient } from "../client";
import type { DashboardPage } from "../app/shell";
import { jsonResponse, renderWithClient } from "../testing/harness";
import { AppSidebar } from "./AppSidebar";

const pages: DashboardPage[] = [
  { path: "/", nav: { label: "Overview", icon: "LayoutDashboard", section: "Monitor", hint: "G O" }, element: null },
  { path: "/jobs", nav: { label: "Jobs", icon: "List", section: "Monitor" }, element: null },
];

// AppSidebar's footer renders EngineStatus, which queries `system`.
const client = { system: { $get: vi.fn().mockResolvedValue(jsonResponse({ connected: true })) } } as unknown as ApiClient;

describe("AppSidebar", () => {
  it("renders the brand, section header and nav, and reports navigation + palette open", async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    const onOpenPalette = vi.fn();
    renderWithClient(
      <AppSidebar pages={pages} activePath="/" onNavigate={onNavigate} onOpenPalette={onOpenPalette} />,
      client,
    );
    expect(screen.getByText("Sidequest")).toBeInTheDocument();
    expect(screen.getByText("Monitor")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Jobs" }));
    expect(onNavigate).toHaveBeenCalledWith("/jobs");

    await user.click(screen.getByRole("button", { name: /search/i }));
    expect(onOpenPalette).toHaveBeenCalled();
  });
});
