import { describe, expect, it, vi } from "vitest";
import { AliveJobUniqueness } from "./alive-job-uniqueness";
import { UniquenessFactory } from "./factory";
import { FixedWindowUniqueness } from "./fixed-window-uniqueness";
import { UniquenessConfig } from "./uniqueness";

// Mock the uniqueness classes
vi.mock("./alive-job-uniqueness", () => ({
  AliveJobUniqueness: vi.fn(),
}));

vi.mock("./fixed-window-uniqueness", () => ({
  FixedWindowUniqueness: vi.fn(),
}));

describe("UniquenessFactory", () => {
  it('should create AliveJobUniqueness when type is "alive-job"', () => {
    const config: UniquenessConfig = { type: "alive-job" };

    UniquenessFactory.create(config);

    expect(AliveJobUniqueness).toHaveBeenCalledWith(config);
  });

  it('should create FixedWindowUniqueness when type is "fixed-window"', () => {
    const config: UniquenessConfig = { type: "fixed-window" };

    UniquenessFactory.create(config);

    expect(FixedWindowUniqueness).toHaveBeenCalledWith(config);
  });

  it("should throw error for unknown uniqueness strategy", () => {
    const config = { type: "unknown-strategy" } as UniquenessConfig;

    expect(() => UniquenessFactory.create(config)).toThrow("Unknown uniqueness strategy: unknown-strategy");
  });

  it("should return instance of the correct uniqueness class", () => {
    const mockInstance = {} as AliveJobUniqueness;
    vi.mocked(AliveJobUniqueness).mockImplementation(() => mockInstance);

    const config: UniquenessConfig = { type: "alive-job" };
    const result = UniquenessFactory.create(config);

    expect(result).toBe(mockInstance);
  });
});
