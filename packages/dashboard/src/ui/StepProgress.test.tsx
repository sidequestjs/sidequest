import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StepProgress, type Step } from "./StepProgress";

describe("StepProgress", () => {
  it("renders a mixed-status timeline covering every node treatment", () => {
    const steps: Step[] = [
      { label: "Enqueued", icon: "inbox", status: "done" },
      { label: "Claimed", status: "active" }, // no icon -> "circle"
      { label: "Running", icon: "play", status: "pending" },
      { label: "Failed", icon: "x", status: "failed" },
    ];
    render(<StepProgress steps={steps} />);

    for (const s of steps) {
      expect(screen.getByText(s.label)).toBeInTheDocument();
    }
  });

  it("renders a single step (first and last) with className/style", () => {
    render(<StepProgress steps={[{ label: "Only", status: "canceled" }]} className="extra" style={{ opacity: 1 }} />);

    const root = screen.getByText("Only").closest(".sq-steps");
    expect(root).toHaveClass("extra");
  });
});
