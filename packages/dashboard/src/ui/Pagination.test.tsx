import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Pagination } from "./Pagination";

describe("Pagination", () => {
  it("enables both ends when there is a previous and next page", () => {
    render(<Pagination page={2} hasNext />);

    expect(screen.getByText("Page 2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "«" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "»" })).toBeEnabled();
  });

  it("disables the ends on the first page with no next, and honors className/style", () => {
    const onPrev = vi.fn();
    const onNext = vi.fn();
    render(<Pagination page={1} onPrev={onPrev} onNext={onNext} className="extra" style={{ opacity: 1 }} />);

    expect(screen.getByRole("button", { name: "«" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "»" })).toBeDisabled();
  });
});
