import type { JobData } from "@sidequest/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { JobsTable } from "./JobsTable";

const jobs = [
  { id: 1, class: "SendEmail", queue: "mail", state: "failed", attempt: 5, max_attempts: 5, claimed_by: null },
  { id: 2, class: "Charge", queue: "billing", state: "running", attempt: 1, max_attempts: 3, claimed_by: "w1" },
] as unknown as JobData[];

const noop = () => undefined;

describe("JobsTable", () => {
  it("renders rows with #id, class, attempts and a footer, and opens a job on click", async () => {
    const user = userEvent.setup();
    const onOpenJob = vi.fn();
    render(
      <JobsTable
        jobs={jobs}
        page={1}
        pageSize={11}
        total={2}
        hasNext={false}
        onPage={noop}
        onOpenJob={onOpenJob}
        onRerun={noop}
        onCancel={noop}
      />,
    );
    expect(screen.getByText("SendEmail")).toBeInTheDocument();
    expect(screen.getByText("#1")).toBeInTheDocument();
    expect(screen.getByText("5/5")).toBeInTheDocument();
    expect(screen.getByText("1–2 of 2")).toBeInTheDocument();
    await user.click(screen.getByText("SendEmail"));
    expect(onOpenJob).toHaveBeenCalledWith(1);
  });

  it("renders the empty state", () => {
    render(
      <JobsTable
        jobs={[]}
        page={1}
        pageSize={11}
        total={0}
        hasNext={false}
        onPage={noop}
        onOpenJob={noop}
        onRerun={noop}
        onCancel={noop}
      />,
    );
    expect(screen.getByText(/no jobs match/i)).toBeInTheDocument();
  });
});
