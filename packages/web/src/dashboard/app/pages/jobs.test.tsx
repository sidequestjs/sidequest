import { screen, waitFor } from "@testing-library/react";
import type { ApiClient } from "../../client";
import { jsonResponse, renderWithClient } from "../../testing/harness";
import { JobsPage } from "./jobs";

describe("JobsPage", () => {
  it("renders the jobs returned by the api", async () => {
    const client = {
      jobs: {
        $get: vi.fn().mockResolvedValue(
          jsonResponse({
            jobs: [{ id: 1, class: "SendEmailJob", queue: "email", state: "failed", attempt: 5, max_attempts: 5 }],
            pagination: { page: 1, pageSize: 20, hasNextPage: false },
          }),
        ),
        meta: { $get: vi.fn().mockResolvedValue(jsonResponse({ queues: ["email"] })) },
      },
    } as unknown as ApiClient;

    renderWithClient(<JobsPage />, client);

    await waitFor(() => expect(screen.getByText("SendEmailJob")).toBeInTheDocument());
    expect(screen.getByText("5/5")).toBeInTheDocument();
  });
});
