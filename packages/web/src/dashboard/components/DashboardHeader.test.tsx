import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardHeader } from "./DashboardHeader";

describe("DashboardHeader", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: false }));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the title, subtitle, theme toggle and docs link", () => {
    render(<DashboardHeader title="Overview" subtitle="at a glance" />);
    expect(screen.getByRole("heading", { name: "Overview" })).toBeInTheDocument();
    expect(screen.getByText("at a glance")).toBeInTheDocument();
    expect(screen.getByRole("switch")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /docs/i })).toHaveAttribute("href", "https://docs.sidequestjs.com");
  });
});
