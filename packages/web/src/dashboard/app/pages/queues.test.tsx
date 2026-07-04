import { screen, waitFor } from "@testing-library/react";
import type { ApiClient } from "../../client";
import { jsonResponse, renderWithClient } from "../../testing/harness";
import { QueuesPage } from "./queues";

describe("QueuesPage", () => {
  it("renders queues with a pause/resume toggle", async () => {
    const client = {
      queues: {
        $get: vi.fn().mockResolvedValue(
          jsonResponse([{ name: "email", state: "active", concurrency: 2, priority: 20, jobs: { total: 8 } }]),
        ),
      },
    } as unknown as ApiClient;

    renderWithClient(<QueuesPage />, client);

    await waitFor(() => expect(screen.getByText("email")).toBeInTheDocument());
    // an active queue offers a "Pause" action
    expect(screen.getByText("Pause")).toBeInTheDocument();
  });
});
