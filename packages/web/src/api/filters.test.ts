import { computeTimeRange } from "./filters";

describe("computeTimeRange", () => {
  it("returns undefined for no range or 'any'", () => {
    expect(computeTimeRange()).toBeUndefined();
    expect(computeTimeRange("any")).toBeUndefined();
    expect(computeTimeRange("unknown")).toBeUndefined();
  });

  it("maps a relative token to a 'from' in the past", () => {
    const range = computeTimeRange("5m");
    expect(range?.from).toBeInstanceOf(Date);
    expect(range?.from!.getTime()).toBeLessThan(Date.now());
    expect(range?.to).toBeUndefined();
  });

  it("maps 'custom' + valid start/end to an absolute range", () => {
    const range = computeTimeRange("custom", "2026-01-01T00:00:00Z", "2026-01-02T00:00:00Z");
    expect(range?.from?.toISOString()).toBe("2026-01-01T00:00:00.000Z");
    expect(range?.to?.toISOString()).toBe("2026-01-02T00:00:00.000Z");
  });

  it("ignores 'custom' with invalid dates", () => {
    expect(computeTimeRange("custom", "nope", "nope")).toBeUndefined();
  });
});
