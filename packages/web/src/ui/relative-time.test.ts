import { describe, expect, it } from "vitest";
import { relativeTime } from "./relative-time";

const NOW = new Date("2026-07-05T12:00:00Z").getTime();
const ago = (ms: number) => new Date(NOW - ms).toISOString();

describe("relativeTime", () => {
  it("returns a dash for missing values (and uses Date.now() by default)", () => {
    expect(relativeTime(null, NOW)).toBe("—");
    expect(relativeTime(undefined)).toBe("—");
  });

  it("formats seconds, minutes, hours and days", () => {
    expect(relativeTime(ago(5_000), NOW)).toBe("5s ago");
    expect(relativeTime(ago(3 * 60_000), NOW)).toBe("3m ago");
    expect(relativeTime(ago(2 * 3_600_000), NOW)).toBe("2h ago");
    expect(relativeTime(ago(3 * 86_400_000), NOW)).toBe("3d ago");
  });

  it("clamps sub-second values to at least 1s", () => {
    expect(relativeTime(ago(200), NOW)).toBe("1s ago");
  });
});
