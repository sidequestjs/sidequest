import { screen, waitFor } from "@testing-library/react";
import type { ApiClient } from "../../client";
import { jsonResponse, renderWithClient } from "../../testing/harness";
import { OverviewPage } from "./overview";

describe("OverviewPage", () => {
  it("renders the sparkline stat cards and throughput panel from the overview data", async () => {
    const client = {
      overview: {
        $get: vi.fn().mockResolvedValue(
          jsonResponse({ total: 17, waiting: 4, running: 1, completed: 9, failed: 2, canceled: 1, claimed: 0 }),
        ),
        timeseries: {
          $get: vi.fn().mockResolvedValue(
            jsonResponse([
              { timestamp: "2026-07-05T12:00:00Z", completed: 3, failed: 1, running: 1, waiting: 4 },
              { timestamp: "2026-07-05T12:01:00Z", completed: 9, failed: 2, running: 1, waiting: 4 },
            ]),
          ),
        },
      },
    } as unknown as ApiClient;

    renderWithClient(<OverviewPage />, client);

    // padded mono values: completed 9 -> "09", running 1 -> "01"
    await waitFor(() => expect(screen.getByText("09")).toBeInTheDocument());
    expect(screen.getByText("Completed")).toBeInTheDocument();
    expect(screen.getByText("Job throughput")).toBeInTheDocument();
    expect(screen.getByText("Success rate")).toBeInTheDocument();
  });
});
