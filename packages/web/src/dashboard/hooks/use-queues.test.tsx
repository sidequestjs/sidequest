import { waitFor } from "@testing-library/react";
import type { ApiClient } from "../client";
import { jsonResponse, renderHookWithClient } from "../testing/harness";
import { useQueueActions, useQueues } from "./use-queues";

describe("useQueues", () => {
  it("fetches the queues list", async () => {
    const $get = vi.fn().mockResolvedValue(jsonResponse([{ name: "email", jobs: { total: 2 } }]));
    const client = { queues: { $get } } as unknown as ApiClient;

    const { result } = renderHookWithClient(() => useQueues(), client);

    await waitFor(() => expect(result.current.data).toEqual([{ name: "email", jobs: { total: 2 } }]));
  });
});

describe("useQueueActions", () => {
  it("posts toggle for a queue name", async () => {
    const $post = vi.fn().mockResolvedValue(jsonResponse({ name: "email", state: "paused" }));
    const client = { queues: { ":name": { toggle: { $post } } } } as unknown as ApiClient;

    const { result } = renderHookWithClient(() => useQueueActions(), client);

    await result.current.toggle("email");
    expect($post).toHaveBeenCalledWith({ param: { name: "email" } });
  });
});
