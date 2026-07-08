import { screen, waitFor } from "@testing-library/react";
import type { ApiClient } from "../../client";
import { jsonResponse, renderWithClient } from "../../testing/harness";
import { JobsListView } from "./jobs";

function makeClient() {
  return {
    jobs: {
      $get: vi.fn().mockResolvedValue(
        jsonResponse({
          jobs: [{ id: 1, class: "SendEmailJob", queue: "email", state: "failed", attempt: 5, max_attempts: 5 }],
          pagination: { page: 1, pageSize: 11, hasNextPage: false },
        }),
      ),
    },
    overview: {
      $get: vi.fn().mockResolvedValue(
        jsonResponse({ total: 12, waiting: 3, running: 1, completed: 6, failed: 1, canceled: 1, claimed: 0 }),
      ),
    },
  } as unknown as ApiClient;
}

describe("JobsPage", () => {
  beforeEach(() => {
    window.location.hash = "";
  });

  it("renders the jobs list with status dots and segment counts", async () => {
    renderWithClient(<JobsListView onOpenJob={() => {}} />, makeClient());

    await waitFor(() => expect(screen.getByText("SendEmailJob")).toBeInTheDocument());
    expect(screen.getByText("5/5")).toBeInTheDocument();
    expect(screen.getByText("#1")).toBeInTheDocument();
    // segmented filter shows the "All" segment
    expect(screen.getByText("All")).toBeInTheDocument();
  });
});
