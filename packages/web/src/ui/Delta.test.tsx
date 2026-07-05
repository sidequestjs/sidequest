import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Delta } from "./Delta";

describe("Delta", () => {
  it("renders an up chip for non-negative values", () => {
    render(<Delta value={12} />);
    expect(screen.getByText("▲ 12%")).toHaveClass("text-status-completed");
  });

  it("renders a down chip for negative values", () => {
    render(<Delta value={-4} className="extra" />);
    const el = screen.getByText("▼ 4%");
    expect(el).toHaveClass("text-status-failed", "extra");
  });
});
