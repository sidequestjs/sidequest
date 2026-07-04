import { act, renderHook } from "@testing-library/react";
import { useHashRoute } from "./router";

describe("useHashRoute", () => {
  beforeEach(() => {
    window.location.hash = "";
  });

  it("defaults to '/'", () => {
    const { result } = renderHook(() => useHashRoute());
    expect(result.current.path).toBe("/");
  });

  it("reflects the current hash", () => {
    window.location.hash = "/queues";
    const { result } = renderHook(() => useHashRoute());
    expect(result.current.path).toBe("/queues");
  });

  it("navigate updates the hash and the reported path", () => {
    const { result } = renderHook(() => useHashRoute());
    act(() => {
      result.current.navigate("/jobs");
      window.dispatchEvent(new Event("hashchange"));
    });
    expect(window.location.hash).toBe("#/jobs");
    expect(result.current.path).toBe("/jobs");
  });
});
