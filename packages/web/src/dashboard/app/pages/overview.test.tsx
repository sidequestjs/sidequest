import { screen, waitFor } from "@testing-library/react";
import type { ApiClient } from "../../client";
import { jsonResponse, renderWithClient } from "../../testing/harness";
import { OverviewPage } from "./overview";

describe("OverviewPage", () => {
  it("renders the stat cards from the overview counts", async () => {
    const client = {
      overview: {
        $get: vi.fn().mockResolvedValue(
          jsonResponse({ total: 17, waiting: 4, running: 1, completed: 9, failed: 2, canceled: 1, claimed: 0 }),
        ),
        timeseries: { $get: vi.fn().mockResolvedValue(jsonResponse([{ timestamp: "t", total: 3 }])) },
      },
    } as unknown as ApiClient;

    renderWithClient(<OverviewPage />, client);

    await waitFor(() => expect(screen.getByText("17")).toBeInTheDocument());
    expect(screen.getByText("Completed")).toBeInTheDocument();
    expect(screen.getByText("9")).toBeInTheDocument();
  });
});
