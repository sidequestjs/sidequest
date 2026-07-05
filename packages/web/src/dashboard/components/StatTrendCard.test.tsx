import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatTrendCard } from "./StatTrendCard";

describe("StatTrendCard", () => {
  it("renders a zero-padded numeric value, label, delta and sparkline", () => {
    const { container } = render(<StatTrendCard label="Running" tone="running" value={3} series={[1, 2, 3, 4]} delta={8} />);
    expect(screen.getByText("Running")).toBeInTheDocument();
    expect(screen.getByText("03")).toBeInTheDocument();
    expect(screen.getByText("▲ 8%")).toBeInTheDocument();
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("renders string values verbatim and a down delta", () => {
    render(<StatTrendCard label="Total" tone="completed" value="1.2k" series={[1]} delta={-2} />);
    expect(screen.getByText("1.2k")).toBeInTheDocument();
    expect(screen.getByText("▼ 2%")).toBeInTheDocument();
  });
});
