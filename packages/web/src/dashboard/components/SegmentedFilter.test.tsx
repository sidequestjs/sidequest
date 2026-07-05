import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SegmentedFilter } from "./SegmentedFilter";

const segments = [
  { key: "all", label: "All", count: 10 },
  { key: "failed", label: "Failed", count: 2 },
];

describe("SegmentedFilter", () => {
  it("renders segments with counts and reports the picked key", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SegmentedFilter segments={segments} value="all" onChange={onChange} />);
    expect(screen.getByText("All")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    await user.click(screen.getByText("Failed"));
    expect(onChange).toHaveBeenCalledWith("failed");
  });
});
