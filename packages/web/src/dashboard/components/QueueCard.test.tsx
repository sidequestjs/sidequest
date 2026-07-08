import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { QueueWithCounts } from "../../api/services/queue-service";
import { QueueCard } from "./QueueCard";

const queue = {
  name: "default",
  state: "active",
  concurrency: 5,
  priority: 0,
  jobs: { waiting: 3, running: 1, completed: 40, failed: 2 },
} as unknown as QueueWithCounts;

describe("QueueCard", () => {
  it("renders the queue name, chips and counts, and toggles pause", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(<QueueCard queue={queue} onToggle={onToggle} />);
    expect(screen.getByText("default")).toBeInTheDocument();
    expect(screen.getByText("concurrency 5")).toBeInTheDocument();
    expect(screen.getByText("priority 0")).toBeInTheDocument();
    await user.click(screen.getByText("Pause"));
    expect(onToggle).toHaveBeenCalledWith("default");
  });

  it("offers Activate for a paused queue", () => {
    render(<QueueCard queue={{ ...queue, state: "paused" } as QueueWithCounts} onToggle={() => undefined} />);
    expect(screen.getByText("Activate")).toBeInTheDocument();
  });
});
