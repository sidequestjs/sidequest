import { describe, expect, it } from "vitest";
import {
  addCoalescedField,
  coalesce,
  generateTimeBuckets,
  getTimeRangeConfig,
  matchDateRange,
  parseTimeRange,
} from "./utils";

describe("addCoalescedField", () => {
  it("should generate the correct $addFields object for multiple columns", () => {
    const result = addCoalescedField(
      "timestamp",
      "completed_at",
      "failed_at",
      "canceled_at",
      "attempted_at",
      "claimed_at",
      "inserted_at",
    );

    expect(result).toEqual({
      $addFields: {
        timestamp: {
          $ifNull: [
            "$completed_at",
            {
              $ifNull: [
                "$failed_at",
                {
                  $ifNull: [
                    "$canceled_at",
                    {
                      $ifNull: [
                        "$attempted_at",
                        {
                          $ifNull: ["$claimed_at", "$inserted_at"],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
    });
  });

  it("should throw if no columns are provided", () => {
    expect(() => addCoalescedField("timestamp")).toThrow("At least one column is required.");
  });

  it("should generate a simple $addFields for a single column", () => {
    const result = addCoalescedField("timestamp", "inserted_at");
    expect(result).toEqual({
      $addFields: {
        timestamp: "$inserted_at",
      },
    });
  });
});

describe("coalesce", () => {
  it("should generate the correct nested $ifNull expression for multiple columns", () => {
    const expr = coalesce("completed_at", "failed_at", "canceled_at", "attempted_at", "claimed_at", "inserted_at");

    expect(expr).toEqual({
      $ifNull: [
        "$completed_at",
        {
          $ifNull: [
            "$failed_at",
            {
              $ifNull: [
                "$canceled_at",
                {
                  $ifNull: [
                    "$attempted_at",
                    {
                      $ifNull: ["$claimed_at", "$inserted_at"],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });
  });

  it("should throw if no columns are provided", () => {
    expect(() => coalesce()).toThrow("At least one column is required.");
  });

  it("should return just the column ref if only one column is provided", () => {
    expect(coalesce("inserted_at")).toBe("$inserted_at");
  });
});

describe("matchDateRange", () => {
  it("should return undefined if no range is provided", () => {
    expect(matchDateRange("timestamp")).toBeUndefined();
    expect(matchDateRange("timestamp", {})).toBeUndefined();
  });

  it("should return $match with $gte and $lte when both from and to are set", () => {
    const from = new Date("2024-01-01T00:00:00Z");
    const to = new Date("2024-01-02T00:00:00Z");
    expect(matchDateRange("createdAt", { from, to })).toEqual({
      $match: { createdAt: { $gte: from, $lte: to } },
    });
  });

  it("should return $match with only $gte if only from is set", () => {
    const from = new Date("2024-01-01T00:00:00Z");
    expect(matchDateRange("createdAt", { from })).toEqual({
      $match: { createdAt: { $gte: from } },
    });
  });

  it("should return $match with only $lte if only to is set", () => {
    const to = new Date("2024-01-02T00:00:00Z");
    expect(matchDateRange("createdAt", { to })).toEqual({
      $match: { createdAt: { $lte: to } },
    });
  });
});

describe("parseTimeRange", () => {
  it("should parse valid time range strings", () => {
    expect(parseTimeRange("12m")).toEqual({ amount: 12, unit: "m" });
    expect(parseTimeRange("5h")).toEqual({ amount: 5, unit: "h" });
    expect(parseTimeRange("3d")).toEqual({ amount: 3, unit: "d" });
  });

  it("should throw on invalid time range format", () => {
    expect(() => parseTimeRange("12")).toThrow();
    expect(() => parseTimeRange("abc")).toThrow();
    expect(() => parseTimeRange("12w")).toThrow();
    expect(() => parseTimeRange("")).toThrow();
  });
});

describe("getTimeRangeConfig", () => {
  it("should return correct config for minutes", () => {
    const result = getTimeRangeConfig(12, "m");
    expect(result.intervalMs).toBe(12 * 60 * 1000);
    expect(result.granularityMs).toBe(60 * 1000);
    expect(result.dateGrouping).toHaveProperty("minute");
  });

  it("should return correct config for hours", () => {
    const result = getTimeRangeConfig(2, "h");
    expect(result.intervalMs).toBe(2 * 60 * 60 * 1000);
    expect(result.granularityMs).toBe(60 * 60 * 1000);
    expect(result.dateGrouping).toHaveProperty("hour");
    expect(result.dateGrouping).not.toHaveProperty("minute");
  });

  it("should return correct config for days", () => {
    const result = getTimeRangeConfig(7, "d");
    expect(result.intervalMs).toBe(7 * 24 * 60 * 60 * 1000);
    expect(result.granularityMs).toBe(24 * 60 * 60 * 1000);
    expect(result.dateGrouping).not.toHaveProperty("hour");
    expect(result.dateGrouping).not.toHaveProperty("minute");
  });
});

describe("generateTimeBuckets", () => {
  it("should generate one bucket per granularity between start and end", () => {
    const start = new Date(Date.UTC(2024, 0, 1, 0, 0, 0)); // 2024-01-01T00:00:00Z
    const end = new Date(Date.UTC(2024, 0, 1, 2, 0, 0)); // 2024-01-01T02:00:00Z
    // granularity 1 hour, expect 2 buckets: 01:00:00, 02:00:00
    const buckets = generateTimeBuckets(start, end, 60 * 60 * 1000, "h");
    expect(buckets).toHaveLength(2);
    expect(buckets[0].getUTCHours()).toBe(1);
    expect(buckets[1].getUTCHours()).toBe(2);
  });

  it("should round each bucket to the correct granularity", () => {
    const start = new Date(Date.UTC(2024, 0, 1, 0, 5, 23, 123));
    const end = new Date(Date.UTC(2024, 0, 1, 0, 7, 0));
    const buckets = generateTimeBuckets(start, end, 60 * 1000, "m");
    expect(buckets[0].getUTCSeconds()).toBe(0);
    expect(buckets[0].getUTCMilliseconds()).toBe(0);
    expect(buckets[0].getUTCMinutes()).toBe(6); // first bucket after 00:05:23 + 1min = 00:06:23 => rounds to 00:06:00
  });

  it("should generate empty array if range is too small", () => {
    const start = new Date(Date.UTC(2024, 0, 1, 0, 0, 0));
    const end = new Date(Date.UTC(2024, 0, 1, 0, 0, 30)); // less than one minute
    const buckets = generateTimeBuckets(start, end, 60 * 1000, "m");
    expect(buckets).toEqual([]);
  });
});
