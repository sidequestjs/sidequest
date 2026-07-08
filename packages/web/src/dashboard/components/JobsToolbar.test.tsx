import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { JobsToolbar } from "./JobsToolbar";

describe("JobsToolbar", () => {
  it("renders the search box and reports typing", async () => {
    const user = userEvent.setup();
    const onQuery = vi.fn();
    render(<JobsToolbar query="" onQuery={onQuery} />);
    await user.type(screen.getByPlaceholderText(/search by class/i), "a");
    expect(onQuery).toHaveBeenCalledWith("a");
  });
});
