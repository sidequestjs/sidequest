import { describe, expect, it } from "vitest";
import { deserializeAbortReason, JobCanceled, JobTimeout, serializeAbortReason } from "./abort-reason";

describe("abort-reason", () => {
  it("round-trips a JobTimeout reason through the wire form", () => {
    const message = serializeAbortReason(new JobTimeout(1500));
    expect(message).toEqual({ kind: "timeout", timeoutMs: 1500 });

    const reason = deserializeAbortReason(message);
    expect(reason).toBeInstanceOf(JobTimeout);
    expect((reason as JobTimeout).timeoutMs).toBe(1500);
  });

  it("round-trips a JobCanceled reason through the wire form", () => {
    const message = serializeAbortReason(new JobCanceled());
    expect(message).toEqual({ kind: "canceled" });
    expect(deserializeAbortReason(message)).toBeInstanceOf(JobCanceled);
  });

  it("treats any non-timeout reason as canceled", () => {
    expect(serializeAbortReason(new Error("boom"))).toEqual({ kind: "canceled" });
    expect(serializeAbortReason(undefined)).toEqual({ kind: "canceled" });
  });
});
