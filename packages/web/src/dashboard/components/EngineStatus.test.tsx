import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ApiClient } from "../client";
import { jsonResponse, renderWithClient } from "../testing/harness";
import { EngineStatus } from "./EngineStatus";

describe("EngineStatus", () => {
  it("shows connected with the driver and version when reported", async () => {
    const client = {
      system: {
        $get: vi
          .fn()
          .mockResolvedValue(jsonResponse({ connected: true, driver: "@sidequest/sqlite-backend", version: "1.2.3" })),
      },
    } as unknown as ApiClient;
    renderWithClient(<EngineStatus />, client);
    await waitFor(() => expect(screen.getByText("Engine connected")).toBeInTheDocument());
    expect(screen.getByText("@sidequest/sqlite-backend · 1.2.3")).toBeInTheDocument();
  });

  it("shows offline when the query fails", async () => {
    const client = { system: { $get: vi.fn().mockRejectedValue(new Error("down")) } } as unknown as ApiClient;
    renderWithClient(<EngineStatus />, client);
    await waitFor(() => expect(screen.getByText("Engine offline")).toBeInTheDocument());
  });
});
