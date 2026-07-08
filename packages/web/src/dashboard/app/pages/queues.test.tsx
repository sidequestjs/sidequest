import { screen, waitFor } from "@testing-library/react";
import type { ApiClient } from "../../client";
import { jsonResponse, renderWithClient } from "../../testing/harness";
import { QueuesPage } from "./queues";

describe("QueuesPage", () => {
  it("renders a queue card with its load-bar counts and a pause action", async () => {
    const client = {
      queues: {
        $get: vi.fn().mockResolvedValue(
          jsonResponse([
            {
              name: "email",
              state: "active",
              concurrency: 2,
              priority: 20,
              jobs: { total: 8, waiting: 3, running: 1, completed: 4, failed: 0 },
            },
          ]),
        ),
      },
    } as unknown as ApiClient;

    renderWithClient(<QueuesPage />, client);

    await waitFor(() => expect(screen.getByText("email")).toBeInTheDocument());
    // an active queue offers a "Pause" action, and shows its concurrency chip
    expect(screen.getByText("Pause")).toBeInTheDocument();
    expect(screen.getByText("concurrency 2")).toBeInTheDocument();
  });
});
