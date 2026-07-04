import { waitFor } from "@testing-library/react";
import type { ApiClient } from "../client";
import { jsonResponse, renderHookWithClient } from "../testing/harness";
import { useOverview, useOverviewTimeseries } from "./use-overview";

describe("useOverview", () => {
  it("fetches counts, sending the range as a query param", async () => {
    const $get = vi.fn().mockResolvedValue(jsonResponse({ total: 9 }));
    const client = { overview: { $get } } as unknown as ApiClient;

    const { result } = renderHookWithClient(() => useOverview("12h"), client);

    await waitFor(() => expect(result.current.data).toEqual({ total: 9 }));
    expect($get).toHaveBeenCalledWith({ query: { range: "12h" } });
  });
});

describe("useOverviewTimeseries", () => {
  it("fetches the series, sending the range as a query param", async () => {
    const $get = vi.fn().mockResolvedValue(jsonResponse([{ timestamp: "t", total: 1 }]));
    const client = { overview: { timeseries: { $get } } } as unknown as ApiClient;

    const { result } = renderHookWithClient(() => useOverviewTimeseries("12h"), client);

    await waitFor(() => expect(result.current.data).toEqual([{ timestamp: "t", total: 1 }]));
    expect($get).toHaveBeenCalledWith({ query: { range: "12h" } });
  });
});
