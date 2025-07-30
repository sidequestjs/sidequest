import { Job, NonNullableEngineConfig } from "@sidequest/engine";
import { JobOperations } from "./job";
import { QueueOperations } from "./queue";
import { Sidequest, SidequestConfig } from "./sidequest";

// Mock dependencies
const mockSidequestDashboard = vi.hoisted(() => ({
  start: vi.fn(),
  close: vi.fn(),
}));

vi.mock("@sidequest/dashboard", () => ({
  SidequestDashboard: vi.fn().mockImplementation(() => mockSidequestDashboard),
}));

const mockEngineInstance = vi.hoisted(() => ({
  configure: vi.fn().mockResolvedValue({} as NonNullableEngineConfig),
  start: vi.fn(),
  close: vi.fn(),
  getBackend: vi.fn().mockReturnValue({}),
}));

vi.mock("@sidequest/engine", async (importOriginal) => ({
  ...(await importOriginal()),
  Engine: vi.fn().mockImplementation(() => mockEngineInstance),
}));

vi.mock("./job", () => ({
  JobOperations: {
    instance: {
      build: vi.fn(),
      setBackend: vi.fn(),
    },
  },
}));

vi.mock("./queue", () => ({
  QueueOperations: {
    instance: {
      createNewQueue: vi.fn(),
      getQueue: vi.fn(),
      setBackend: vi.fn(),
    },
  },
}));

export class DummyJob extends Job {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(..._optional) {
    super();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  run(..._optional) {
    return "dummy job";
  }
}

describe("Sidequest", () => {
  const mockEngineConfig = {
    backend: { driver: "@sidequest/sqlite-backend", config: ":memory:" },
  } as unknown as SidequestConfig;

  beforeEach(() => {
    // Only clear call history, preserve implementations
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Reset all mocks to clear any test-specific implementations
    vi.resetAllMocks();

    // Restore original mock implementations
    mockSidequestDashboard.start.mockImplementation(vi.fn());
    mockSidequestDashboard.close.mockImplementation(vi.fn());
    mockEngineInstance.configure.mockResolvedValue({} as NonNullableEngineConfig);
    mockEngineInstance.start.mockImplementation(vi.fn());
    mockEngineInstance.close.mockImplementation(vi.fn());
    mockEngineInstance.getBackend.mockReturnValue({});
  });

  describe("static properties", () => {
    it("should provide access to QueueOperations instance", () => {
      expect(Sidequest.queue).toBe(QueueOperations.instance);
    });

    it("should provide access to JobOperations instance", () => {
      expect(Sidequest.job).toBe(JobOperations.instance);
    });
  });

  describe("configure", () => {
    it("should delegate to Engine.configure with provided config", async () => {
      vi.mocked(mockEngineInstance.configure).mockResolvedValue(mockEngineConfig as NonNullableEngineConfig);

      await Sidequest.configure(mockEngineConfig);

      expect(mockEngineInstance.configure).toHaveBeenCalledWith(mockEngineConfig);
      expect(mockEngineInstance.configure).toHaveBeenCalledTimes(1);
    });

    it("should work without config", async () => {
      vi.mocked(mockEngineInstance.configure).mockResolvedValue(mockEngineConfig as NonNullableEngineConfig);

      await Sidequest.configure();

      expect(mockEngineInstance.configure).toHaveBeenCalledWith(undefined);
      expect(mockEngineInstance.configure).toHaveBeenCalledTimes(1);
    });

    it("should handle engine configuration errors", async () => {
      vi.mocked(mockEngineInstance.configure).mockRejectedValueOnce(new Error("Config failed"));

      await expect(Sidequest.configure(mockEngineConfig)).rejects.toThrow();
    });
  });

  describe("start", () => {
    it("should configure engine and start both engine and dashboard", async () => {
      const config: SidequestConfig = {
        ...mockEngineConfig,
        dashboard: { port: 4000 },
      };
      vi.mocked(mockEngineInstance.configure).mockResolvedValue(config as NonNullableEngineConfig);
      await Sidequest.start(config);

      expect(mockEngineInstance.configure).toHaveBeenCalledWith(config);
      expect(mockEngineInstance.start).toHaveBeenCalled();
      expect(mockSidequestDashboard.start).toHaveBeenCalledWith({
        port: 4000,
        backendConfig: mockEngineConfig.backend,
      });
    });

    it("should work without config", async () => {
      vi.mocked(mockEngineInstance.configure).mockResolvedValue(mockEngineConfig as NonNullableEngineConfig);
      await Sidequest.start();

      expect(mockEngineInstance.configure).toHaveBeenCalledWith(undefined);
      expect(mockEngineInstance.start).toHaveBeenCalled();
      expect(mockSidequestDashboard.start).toHaveBeenCalledWith({
        backendConfig: mockEngineConfig.backend,
      });
    });

    it("should work without dashboard config", async () => {
      const config: SidequestConfig = {
        ...mockEngineConfig,
      };

      vi.mocked(mockEngineInstance.configure).mockResolvedValue(config as NonNullableEngineConfig);
      await Sidequest.start(config);

      expect(mockEngineInstance.configure).toHaveBeenCalledWith(config);
      expect(mockEngineInstance.start).toHaveBeenCalled();
      expect(mockSidequestDashboard.start).toHaveBeenCalledWith({
        backendConfig: mockEngineConfig.backend,
      });
    });

    it("should pass through dashboard configuration while excluding backendConfig", async () => {
      const config: SidequestConfig = {
        ...mockEngineConfig,
        dashboard: {
          port: 5000,
        },
      };

      vi.spyOn(Sidequest, "configure").mockResolvedValue(config as NonNullableEngineConfig);

      await Sidequest.start(config);

      expect(mockSidequestDashboard.start).toHaveBeenCalledWith({
        port: 5000,
        backendConfig: mockEngineConfig.backend,
      });
    });

    it("should handle engine configuration errors", async () => {
      const error = new Error("Engine config failed");
      vi.mocked(mockEngineInstance.configure).mockRejectedValue(error);

      await expect(Sidequest.start(mockEngineConfig)).rejects.toThrow();

      expect(mockEngineInstance.configure).toHaveBeenCalled();
      expect(mockSidequestDashboard.start).not.toHaveBeenCalled();
    });

    it("should handle engine start errors", async () => {
      const error = new Error("Engine start failed");
      vi.mocked(mockEngineInstance.start).mockRejectedValue(error);

      await expect(Sidequest.start(mockEngineConfig)).rejects.toThrow();

      expect(mockEngineInstance.start).toHaveBeenCalled();
      expect(mockSidequestDashboard.start).toHaveBeenCalled();
    });

    it("should handle dashboard start errors", async () => {
      const error = new Error("Dashboard start failed");

      mockSidequestDashboard.start.mockImplementation(() => {
        throw error;
      });

      await expect(Sidequest.start(mockEngineConfig)).rejects.toThrow();

      expect(mockEngineInstance.configure).toHaveBeenCalled();
      expect(mockEngineInstance.start).toHaveBeenCalled();
    });

    it("should call stop if engine start fails", async () => {
      const error = new Error("Engine start failed");
      vi.mocked(mockEngineInstance.start).mockRejectedValue(error);

      // Spy on the stop method
      const stopSpy = vi.spyOn(Sidequest, "stop");

      await expect(Sidequest.start(mockEngineConfig)).rejects.toThrow();

      expect(mockEngineInstance.start).toHaveBeenCalled();
      expect(stopSpy).toHaveBeenCalled();

      stopSpy.mockRestore();
    });

    it("should call stop if dashboard start fails", async () => {
      const error = new Error("Dashboard start failed");
      mockSidequestDashboard.start.mockRejectedValue(error);

      // Spy on the stop method
      const stopSpy = vi.spyOn(Sidequest, "stop");

      await expect(Sidequest.start(mockEngineConfig)).rejects.toThrow();

      expect(mockEngineInstance.configure).toHaveBeenCalled();
      expect(mockEngineInstance.start).toHaveBeenCalled();
      expect(mockSidequestDashboard.start).toHaveBeenCalled();
      expect(stopSpy).toHaveBeenCalled();

      stopSpy.mockRestore();
    });
  });

  describe("stop", () => {
    it("should stop both engine and dashboard", async () => {
      await Sidequest.stop();

      expect(mockEngineInstance.close).toHaveBeenCalled();
      expect(mockSidequestDashboard.close).toHaveBeenCalled();
    });
  });
});
