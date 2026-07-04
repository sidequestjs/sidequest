import { act, renderHook, waitFor } from "@testing-library/react";
import { useApiQuery } from "./use-api-query";

/** A promise you can resolve/reject from the outside, for deterministic race tests. */
function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("useApiQuery", () => {
  it("starts loading, then exposes the resolved data", async () => {
    const { result } = renderHook(() => useApiQuery(() => Promise.resolve("hi"), []));

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toBe("hi");
    expect(result.current.error).toBeUndefined();
  });

  it("surfaces a rejected fetch as an error", async () => {
    const { result } = renderHook(() => useApiQuery(() => Promise.reject(new Error("boom")), []));

    await waitFor(() => expect(result.current.error).toBeDefined());
    expect(result.current.error?.message).toBe("boom");
    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
  });

  it("refetches when the deps change", async () => {
    const fetcher = vi.fn((n: number) => Promise.resolve(n));
    const { result, rerender } = renderHook(({ n }) => useApiQuery(() => fetcher(n), [n]), {
      initialProps: { n: 1 },
    });

    await waitFor(() => expect(result.current.data).toBe(1));
    rerender({ n: 2 });
    await waitFor(() => expect(result.current.data).toBe(2));
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("re-runs the fetcher on refetch()", async () => {
    const fetcher = vi.fn(() => Promise.resolve("x"));
    const { result } = renderHook(() => useApiQuery(fetcher, []));

    await waitFor(() => expect(result.current.data).toBe("x"));
    act(() => result.current.refetch());
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
  });

  it("ignores a stale in-flight response when a newer request resolves first", async () => {
    const first = deferred<string>();
    const second = deferred<string>();
    const calls = [first, second];
    let i = 0;

    const { result, rerender } = renderHook(({ n }) => useApiQuery(() => calls[i++].promise, [n]), {
      initialProps: { n: 1 },
    });

    // trigger the second request, resolve it first, then resolve the stale first
    rerender({ n: 2 });
    await act(async () => {
      second.resolve("new");
      await second.promise;
    });
    await waitFor(() => expect(result.current.data).toBe("new"));

    await act(async () => {
      first.resolve("stale");
      await first.promise;
    });
    // the late, stale response must not overwrite the newer data
    expect(result.current.data).toBe("new");
  });

  it("polls on the given interval", async () => {
    vi.useFakeTimers();
    try {
      const fetcher = vi.fn(() => Promise.resolve("tick"));
      renderHook(() => useApiQuery(fetcher, [], { refetchInterval: 1000 }));

      expect(fetcher).toHaveBeenCalledTimes(1);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });
      expect(fetcher).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });
});
