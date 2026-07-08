import { waitFor } from "@testing-library/react";
import type { ApiClient } from "../client";
import { jsonResponse, renderHookWithClient } from "../testing/harness";
import { useJob, useJobActions, useJobs, useJobsMeta } from "./use-jobs";

describe("useJobs", () => {
  it("fetches the list, sending the filter as query params", async () => {
    const $get = vi.fn().mockResolvedValue(
      jsonResponse({ jobs: [{ id: 1 }], pagination: { page: 2, pageSize: 30, hasNextPage: false } }),
    );
    const client = { jobs: { $get } } as unknown as ApiClient;

    const { result } = renderHookWithClient(() => useJobs({ state: "failed", page: 2 }), client);

    await waitFor(() => expect(result.current.data).toBeDefined());
    expect($get).toHaveBeenCalledWith({ query: { state: "failed", page: "2" } });
  });
});

describe("useJob", () => {
  it("fetches a single job by id", async () => {
    const $get = vi.fn().mockResolvedValue(jsonResponse({ id: 7 }));
    const client = { jobs: { ":id": { $get } } } as unknown as ApiClient;

    const { result } = renderHookWithClient(() => useJob(7), client);

    await waitFor(() => expect(result.current.data).toEqual({ id: 7 }));
    expect($get).toHaveBeenCalledWith({ param: { id: "7" } });
  });
});

describe("useJobsMeta", () => {
  it("fetches the distinct queue names", async () => {
    const $get = vi.fn().mockResolvedValue(jsonResponse({ queues: ["email"] }));
    const client = { jobs: { meta: { $get } } } as unknown as ApiClient;

    const { result } = renderHookWithClient(() => useJobsMeta(), client);

    await waitFor(() => expect(result.current.data).toEqual({ queues: ["email"] }));
  });
});

describe("useJobActions", () => {
  it("posts run/cancel/rerun for a job id", async () => {
    const post = () => vi.fn().mockResolvedValue(jsonResponse({ id: 1 }));
    const run = post();
    const cancel = post();
    const rerun = post();
    const client = {
      jobs: { ":id": { run: { $post: run }, cancel: { $post: cancel }, rerun: { $post: rerun } } },
    } as unknown as ApiClient;

    const { result } = renderHookWithClient(() => useJobActions(), client);

    await result.current.run(1);
    await result.current.cancel(1);
    await result.current.rerun(1);

    expect(run).toHaveBeenCalledWith({ param: { id: "1" } });
    expect(cancel).toHaveBeenCalledWith({ param: { id: "1" } });
    expect(rerun).toHaveBeenCalledWith({ param: { id: "1" } });
  });
});
