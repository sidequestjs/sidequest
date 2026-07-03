import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatCard } from "./StatCard";

describe("StatCard", () => {
  it("renders label and value with defaults (no icon, no delta)", () => {
    const { container } = render(<StatCard label="Completed" value={42} />);

    expect(screen.getByText("Completed")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(container.querySelector("svg")).toBeNull();
  });

  it("renders a tone, icon, delta and className", () => {
    const { container } = render(
      <StatCard label="Failed" value={3} tone="failed" icon="activity" delta="+2 today" className="extra" style={{}} />,
    );

    expect(container.querySelector(".sq-statcard")).toHaveClass("extra");
    expect(container.querySelector("svg")).not.toBeNull();
    expect(screen.getByText("+2 today")).toBeInTheDocument();
  });
});
