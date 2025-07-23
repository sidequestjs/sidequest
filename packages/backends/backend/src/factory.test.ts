import { Knex } from "knex";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BackendConfig } from "./config";
import { createBackendFromDriver } from "./factory";
import { SQLBackend } from "./sql-backend";

// Mock backend class for testing
class MockBackend extends SQLBackend {
  constructor() {
    super(null as unknown as Knex);
  }
}

describe("createBackendFromDriver", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create backend instance with valid driver", async () => {
    const config: BackendConfig = {
      driver: "./mock-driver",
      config: { test: "config" },
    };

    // Mock the dynamic import
    vi.doMock("./mock-driver", () => ({
      default: MockBackend,
    }));

    const backend = await createBackendFromDriver(config);
    expect(backend).toBeInstanceOf(MockBackend);
  });

  it("should throw error when driver module not found", async () => {
    const config: BackendConfig = {
      driver: "./non-existent-driver",
      config: {},
    };

    // Mock failed import
    vi.doMock("./non-existent-driver", () => ({ default: null }));

    await expect(createBackendFromDriver(config)).rejects.toThrow();
  });

  it("should throw error when driver does not export default", async () => {
    const config: BackendConfig = {
      driver: "./invalid-driver",
      config: {},
    };

    // Mock import without default export
    vi.doMock("./invalid-driver", () => ({
      someOtherExport: "value",
      default: undefined,
    }));

    await expect(createBackendFromDriver(config)).rejects.toThrow();
  });

  it("should throw error when default export is not a function", async () => {
    const config: BackendConfig = {
      driver: "./string-driver",
      config: {},
    };

    // Mock import with non-function default
    vi.doMock("./string-driver", () => ({
      default: "not a function",
    }));

    await expect(createBackendFromDriver(config)).rejects.toThrow();
  });

  it("should pass config to backend constructor", async () => {
    const testConfig = { database: "test", port: 3000 };
    const config: BackendConfig = {
      driver: "./config-driver",
      config: testConfig,
    };

    const MockBackendWithSpy = vi.fn().mockImplementation(function (this: SQLBackend) {
      // noop
    });

    vi.doMock("./config-driver", () => ({
      default: MockBackendWithSpy,
    }));

    await createBackendFromDriver(config);
    expect(MockBackendWithSpy).toHaveBeenCalledWith(testConfig);
  });
});
