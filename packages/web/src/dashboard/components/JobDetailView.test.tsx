import type { JobData } from "@sidequest/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { JobDetailView } from "./JobDetailView";

const job = {
  id: 7,
  class: "SendEmail",
  script: "jobs/send-email.js",
  state: "failed",
  attempt: 3,
  max_attempts: 3,
  constructor_args: [],
  args: ["a@b.com"],
  result: null,
  errors: [{ message: "boom", stack: "at handler (x.js:1)" }],
} as unknown as JobData;

describe("JobDetailView", () => {
  it("renders the header, details, errors and a re-run action, and fires back", async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    const onRerun = vi.fn();
    render(<JobDetailView job={job} onBack={onBack} onRerun={onRerun} onCancel={() => undefined} />);
    expect(screen.getByRole("heading", { name: /#7 — SendEmail/ })).toBeInTheDocument();
    expect(screen.getByText("boom")).toBeInTheDocument();
    await user.click(screen.getByText("Re-Run"));
    expect(onRerun).toHaveBeenCalledWith(7);
    await user.click(screen.getByText("Back"));
    expect(onBack).toHaveBeenCalled();
  });

  it("offers Cancel for a non-settled job", () => {
    render(
      <JobDetailView job={{ ...job, state: "running" } as JobData} onBack={() => undefined} onRerun={() => undefined} onCancel={() => undefined} />,
    );
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });
});
