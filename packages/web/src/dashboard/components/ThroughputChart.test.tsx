import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ThroughputChart } from "./ThroughputChart";

describe("ThroughputChart", () => {
  it("renders the card and range selector without a canvas context (jsdom)", async () => {
    const user = userEvent.setup();
    const onRangeChange = vi.fn();
    render(
      <ThroughputChart
        data={[{ timestamp: "2026-07-05T12:00:00Z", completed: 3, failed: 1 }]}
        range="12m"
        onRangeChange={onRangeChange}
      />,
    );
    expect(screen.getByText("Job throughput")).toBeInTheDocument();
    await user.selectOptions(screen.getByRole("combobox"), "12h");
    expect(onRangeChange).toHaveBeenCalledWith("12h");
  });
});
