/* eslint-disable @typescript-eslint/unbound-method */
import { SidequestDashboard } from "@sidequest/dashboard";
import { Engine, Job, JobBuilder, JobClassType, NonNullableEngineConfig } from "@sidequest/engine";
import { JobOperations } from "./job";
import { QueueOperations } from "./queue";
import { Sidequest, SidequestConfig } from "./sidequest";

// Mock dependencies
vi.mock("@sidequest/dashboard", () => ({
  SidequestDashboard: {
    start: vi.fn(),
  },
}));

vi.mock("@sidequest/engine", async (importOriginal) => ({
  ...(await importOriginal()),
  Engine: {
    configure: vi.fn(),
    start: vi.fn(),
  },
}));

vi.mock("./job", () => ({
  JobOperations: {
    instance: {
      build: vi.fn(),
    },
  },
}));

vi.mock("./queue", () => ({
  QueueOperations: {
    instance: {
      createNewQueue: vi.fn(),
      getQueue: vi.fn(),
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
    vi.clearAllMocks();
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
      vi.mocked(Engine.configure).mockResolvedValue(mockEngineConfig as NonNullableEngineConfig);

      await Sidequest.configure(mockEngineConfig);

      expect(Engine.configure).toHaveBeenCalledWith(mockEngineConfig);
      expect(Engine.configure).toHaveBeenCalledTimes(1);
    });

    it("should work without config", async () => {
      vi.mocked(Engine.configure).mockResolvedValue(mockEngineConfig as NonNullableEngineConfig);

      await Sidequest.configure();

      expect(Engine.configure).toHaveBeenCalledWith(undefined);
      expect(Engine.configure).toHaveBeenCalledTimes(1);
    });

    it("should handle engine configuration errors", async () => {
      const error = new Error("Configuration failed");
      vi.mocked(Engine.configure).mockRejectedValue(error);

      await expect(Sidequest.configure(mockEngineConfig)).rejects.toThrow();
    });
  });

  describe("start", () => {
    beforeEach(() => {
      vi.mocked(Engine.configure).mockResolvedValue(mockEngineConfig as NonNullableEngineConfig);
      vi.mocked(Engine.start).mockResolvedValue(undefined);
      vi.mocked(SidequestDashboard.start).mockResolvedValue(undefined);
    });

    it("should configure engine and start both engine and dashboard", async () => {
      const config: SidequestConfig = {
        ...mockEngineConfig,
        dashboard: { port: 4000 },
      };

      await Sidequest.start(config);

      expect(Engine.configure).toHaveBeenCalledWith(config);
      expect(Engine.start).toHaveBeenCalledWith(mockEngineConfig);
      expect(SidequestDashboard.start).toHaveBeenCalledWith({
        port: 4000,
        backendConfig: mockEngineConfig.backend,
      });
    });

    it("should work without config", async () => {
      await Sidequest.start();

      expect(Engine.configure).toHaveBeenCalledWith(undefined);
      expect(Engine.start).toHaveBeenCalledWith(mockEngineConfig);
      expect(SidequestDashboard.start).toHaveBeenCalledWith({
        backendConfig: mockEngineConfig.backend,
      });
    });

    it("should work without dashboard config", async () => {
      const config: SidequestConfig = {
        ...mockEngineConfig,
      };

      await Sidequest.start(config);

      expect(Engine.configure).toHaveBeenCalledWith(config);
      expect(Engine.start).toHaveBeenCalledWith(mockEngineConfig);
      expect(SidequestDashboard.start).toHaveBeenCalledWith({
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

      await Sidequest.start(config);

      expect(SidequestDashboard.start).toHaveBeenCalledWith({
        port: 5000,
        backendConfig: mockEngineConfig.backend,
      });
    });

    it("should handle engine configuration errors", async () => {
      const error = new Error("Engine config failed");
      vi.mocked(Engine.configure).mockRejectedValue(error);

      await expect(Sidequest.start(mockEngineConfig)).rejects.toThrow();

      expect(Engine.start).not.toHaveBeenCalled();
      expect(SidequestDashboard.start).not.toHaveBeenCalled();
    });

    it("should handle engine start errors", async () => {
      const error = new Error("Engine start failed");
      vi.mocked(Engine.start).mockRejectedValue(error);

      await expect(Sidequest.start(mockEngineConfig)).rejects.toThrow();

      expect(Engine.configure).toHaveBeenCalled();
      expect(SidequestDashboard.start).toHaveBeenCalled();
    });

    it("should handle dashboard start errors", async () => {
      const error = new Error("Dashboard start failed");
      vi.mocked(SidequestDashboard.start).mockRejectedValue(error);

      await expect(Sidequest.start(mockEngineConfig)).rejects.toThrow();

      expect(Engine.configure).toHaveBeenCalled();
      expect(Engine.start).toHaveBeenCalled();
    });
  });

  describe("build", () => {
    it("should delegate to JobOperations.build", () => {
      const mockJobBuilder = vi.fn();
      vi.mocked(JobOperations.instance.build).mockReturnValue(mockJobBuilder as unknown as JobBuilder<JobClassType>);

      const result = Sidequest.build(DummyJob);

      expect(JobOperations.instance.build).toHaveBeenCalledWith(DummyJob);
      expect(result).toBe(mockJobBuilder);
    });
  });
});
