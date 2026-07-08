import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { DashboardPage } from "../app/shell";
import { CommandPalette } from "./CommandPalette";

const pages: DashboardPage[] = [
  { path: "/", nav: { label: "Overview", icon: "LayoutDashboard" }, element: null },
  { path: "/jobs", nav: { label: "Jobs", icon: "List" }, element: null },
];

const props = { pages, onClose: () => undefined, onNavigate: () => undefined, onToggleTheme: () => undefined };

describe("CommandPalette", () => {
  it("renders nothing when closed", () => {
    const { container } = render(<CommandPalette open={false} {...props} />);
    expect(container.firstChild).toBeNull();
  });

  it("lists commands, filters by query and navigates", async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    render(<CommandPalette open {...props} onNavigate={onNavigate} />);
    expect(screen.getByRole("dialog", { name: "Command palette" })).toBeInTheDocument();
    expect(screen.getByText("Go to Overview")).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText(/command or search/i), "jobs");
    expect(screen.queryByText("Go to Overview")).toBeNull();
    await user.click(screen.getByText("Go to Jobs"));
    expect(onNavigate).toHaveBeenCalledWith("/jobs");
  });

  it("shows an empty state when nothing matches", async () => {
    const user = userEvent.setup();
    render(<CommandPalette open {...props} />);
    await user.type(screen.getByPlaceholderText(/command or search/i), "zzzz");
    expect(screen.getByText("No commands found.")).toBeInTheDocument();
  });
});
