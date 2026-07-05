import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiClient } from "../client";
import { jsonResponse, renderWithClient } from "../testing/harness";
import { DashboardShell, type DashboardPage } from "./shell";

const pages: DashboardPage[] = [
  { path: "/", nav: { label: "Home", icon: "layout-dashboard", subtitle: "the home page" }, element: <div>home page</div> },
  { path: "/jobs", nav: { label: "Jobs", icon: "list" }, element: <div>jobs page</div> },
];

/** A client stub for the engine-status query the sidebar footer makes. */
function stubClient() {
  return { system: { $get: vi.fn().mockResolvedValue(jsonResponse({ connected: true })) } } as unknown as ApiClient;
}

describe("DashboardShell", () => {
  beforeEach(() => {
    window.location.hash = "";
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: false }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the nav entries, header, and the active page", () => {
    renderWithClient(<DashboardShell pages={pages} />, stubClient());
    expect(screen.getByRole("button", { name: "Home" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Jobs" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Home" })).toBeInTheDocument();
    expect(screen.getByText("the home page")).toBeInTheDocument();
    expect(screen.getByText("home page")).toBeInTheDocument();
  });

  it("switches the active page when a nav entry is clicked", async () => {
    const user = userEvent.setup();
    renderWithClient(<DashboardShell pages={pages} />, stubClient());

    await user.click(screen.getByRole("button", { name: "Jobs" }));
    act(() => {
      window.dispatchEvent(new Event("hashchange"));
    });

    expect(screen.getByText("jobs page")).toBeInTheDocument();
  });

  it("opens the command palette on ⌘K and navigates from it", async () => {
    const user = userEvent.setup();
    renderWithClient(<DashboardShell pages={pages} />, stubClient());

    await user.keyboard("{Meta>}k{/Meta}");
    expect(screen.getByRole("dialog", { name: "Command palette" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Go to Jobs/ }));
    act(() => {
      window.dispatchEvent(new Event("hashchange"));
    });
    expect(screen.getByText("jobs page")).toBeInTheDocument();
  });
});
