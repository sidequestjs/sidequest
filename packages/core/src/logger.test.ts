import type { LoggerOptions as PinoOptions } from "pino";
import { Writable } from "stream";
import { afterEach, beforeEach, describe, expect, it, Mock, vi } from "vitest";
import winston from "winston";
import { configureLogger, loadLoggerAdapter, logger, LoggerOptions, SidequestLogger } from "./logger";

// Real pino, but writing JSON lines into an array instead of stdout. `pinoStreams` records the
// destination Sidequest passed to pino().
const pinoLines = vi.hoisted(() => [] as Record<string, unknown>[]);
const pinoStreams = vi.hoisted(() => [] as unknown[]);
vi.mock("pino", async (importOriginal) => {
  const { default: pino } = await importOriginal<{ default: typeof import("pino") }>();
  const destination = new Writable({
    write(chunk: Buffer, _encoding, callback) {
      pinoLines.push(JSON.parse(chunk.toString()) as Record<string, unknown>);
      callback();
    },
  });
  const capture = (options: PinoOptions, stream?: unknown) => {
    pinoStreams.push(stream);
    return pino({ ...options, transport: undefined }, destination);
  };
  return { default: Object.assign(capture, pino) };
});

// Mock console output to capture logs
const mockTransports = {
  console: {
    write: vi.fn(),
  },
};

describe("Logger", () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
    mockTransports.console.write.mockClear();
  });

  describe("configureLogger", () => {
    it("should create a logger with specified level", () => {
      const options: LoggerOptions = { level: "debug" };
      const testLogger = configureLogger(options);

      expect(testLogger).toBeInstanceOf(winston.Logger);
      expect(testLogger.level).toBe("debug");
    });

    it("should create a logger with JSON format when json option is true", () => {
      const options: LoggerOptions = { level: "info", json: true };
      const testLogger = configureLogger(options);

      expect(testLogger).toBeInstanceOf(winston.Logger);
      expect(testLogger.level).toBe("info");
      // Check that the format includes JSON formatting
      expect(testLogger.format).toBeDefined();
    });

    it("should create a logger with colored format when json option is false", () => {
      const options: LoggerOptions = { level: "warn", json: false };
      const testLogger = configureLogger(options);

      expect(testLogger).toBeInstanceOf(winston.Logger);
      expect(testLogger.level).toBe("warn");
    });
  });

  describe("logger function", () => {
    beforeEach(() => {
      configureLogger({ level: "debug", json: false });
    });

    it("should return the default logger when no scope is provided", () => {
      const defaultLogger = logger();
      expect(defaultLogger).toBeInstanceOf(winston.Logger);
    });

    it("should handle different log levels", () => {
      const testLogger = logger("TestLevels");

      // These should not throw errors
      expect(() => testLogger.error("Error message")).not.toThrow();
      expect(() => testLogger.warn("Warning message")).not.toThrow();
      expect(() => testLogger.info("Info message")).not.toThrow();
      expect(() => testLogger.debug("Debug message")).not.toThrow();
    });
  });

  describe("metadata handling", () => {
    beforeEach(() => {
      configureLogger({ level: "debug", json: false });
    });

    it("should handle simple metadata objects", () => {
      const scopedLogger = logger("MetadataTest");
      const metadata = { userId: 123, action: "test" };

      expect(() => {
        scopedLogger.info("Test message with metadata", metadata);
      }).not.toThrow();
    });

    it("should handle nested metadata objects", () => {
      const scopedLogger = logger("NestedTest");
      const metadata = {
        user: {
          id: 123,
          profile: {
            name: "John Doe",
            settings: { theme: "dark" },
          },
        },
        timestamp: new Date(),
      };

      expect(() => {
        scopedLogger.info("Test message with nested metadata", metadata);
      }).not.toThrow();
    });

    it("should handle circular metadata without throwing errors", () => {
      const scopedLogger = logger("CircularTest");

      // Create an object with circular reference
      interface CircularObj {
        name: string;
        nested: {
          value: number;
          parent?: CircularObj;
        };
        self?: CircularObj;
      }

      const circularObj: CircularObj = {
        name: "test",
        nested: {
          value: 42,
        },
      };
      // Create circular reference
      circularObj.self = circularObj;
      circularObj.nested.parent = circularObj;

      // This should not throw an error - the logger should handle circular references gracefully
      expect(() => {
        scopedLogger.info("Message with circular metadata", { circular: circularObj });
      }).not.toThrow();

      // Additional test with more complex circular structure
      interface ComplexNode {
        id: number;
        children: ComplexNode[];
        parent?: ComplexNode;
        siblings?: ComplexNode[];
      }

      const complexCircular: ComplexNode = {
        id: 1,
        children: [],
      };
      const child: ComplexNode = {
        id: 2,
        parent: complexCircular,
        siblings: [],
        children: [],
      };
      complexCircular.children.push(child);
      child.siblings = [complexCircular];

      expect(() => {
        scopedLogger.warn("Complex circular reference", { data: complexCircular });
      }).not.toThrow();
    });

    it("should handle metadata with functions and symbols", () => {
      const scopedLogger = logger("SpecialTest");
      const metadata = {
        func: () => "test function",
        symbol: Symbol("test"),
        date: new Date(),
        regex: /test/g,
        error: new Error("test error"),
      };

      expect(() => {
        scopedLogger.info("Message with special types", metadata);
      }).not.toThrow();
    });

    it("should handle null and undefined metadata", () => {
      const scopedLogger = logger("NullTest");

      expect(() => {
        scopedLogger.info("Message with null", null);
        scopedLogger.info("Message with undefined", undefined);
        scopedLogger.info("Message with mixed", {
          nullValue: null,
          undefinedValue: undefined,
          emptyString: "",
          zero: 0,
        });
      }).not.toThrow();
    });
  });

  describe("error handling", () => {
    it("should handle Error objects with stack traces", () => {
      const scopedLogger = logger("ErrorTest");
      const testError = new Error("Test error message");
      testError.stack = "Error: Test error message\n    at test.js:1:1";

      expect(() => {
        scopedLogger.error("An error occurred", { error: testError });
        scopedLogger.error(testError);
      }).not.toThrow();
    });

    it("should handle custom error objects", () => {
      const scopedLogger = logger("CustomErrorTest");
      const customError = {
        name: "CustomError",
        message: "Custom error message",
        code: "CUSTOM_001",
        details: { context: "test" },
      };

      expect(() => {
        scopedLogger.error("Custom error occurred", customError);
      }).not.toThrow();
    });
  });

  describe("logger configuration", () => {
    it("should respect log level configuration", () => {
      // Create logger with 'warn' level
      const warnLogger = configureLogger({ level: "warn", json: false });
      const scopedWarnLogger = warnLogger.child({ scope: "WarnTest" });

      expect(warnLogger.level).toBe("warn");

      // Debug and info should be filtered out, warn and error should pass through
      expect(scopedWarnLogger.isDebugEnabled()).toBe(false);
      expect(scopedWarnLogger.isInfoEnabled()).toBe(false);
      expect(scopedWarnLogger.isWarnEnabled()).toBe(true);
      expect(scopedWarnLogger.isErrorEnabled()).toBe(true);
    });

    it("should handle different scope strings", () => {
      const scopes = ["Database", "API", "Queue", "Worker", "123", "", "Special@Chars!"];

      scopes.forEach((scope) => {
        expect(() => {
          const scopedLogger = logger(scope);
          scopedLogger.info(`Test message for scope: ${scope}`);
        }).not.toThrow();
      });
    });
  });

  describe("integration tests", () => {
    it("should handle rapid logging without issues", () => {
      const rapidLogger = logger("RapidTest");

      expect(() => {
        for (let i = 0; i < 100; i++) {
          rapidLogger.info(`Rapid log message ${i}`, { iteration: i });
        }
      }).not.toThrow();
    });

    it("should handle concurrent logging from multiple scopes", () => {
      const scopes = ["Scope1", "Scope2", "Scope3"];

      expect(() => {
        scopes.forEach((scope) => {
          const scopedLogger = logger(scope);
          for (let i = 0; i < 10; i++) {
            scopedLogger.info(`Message ${i} from ${scope}`);
          }
        });
      }).not.toThrow();
    });
  });

  describe("custom logger", () => {
    let customLogger: Record<keyof SidequestLogger, Mock<SidequestLogger["info"]>>;

    beforeEach(() => {
      customLogger = { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() };
    });

    afterEach(() => {
      configureLogger({ level: "info", json: false });
    });

    it("should forward entries to the custom logger instead of the console", () => {
      const testLogger = configureLogger({ level: "debug" }, customLogger);

      logger().info("Plain message");

      expect(testLogger.transports).toHaveLength(1);
      expect(testLogger.transports[0]).not.toBeInstanceOf(winston.transports.Console);
      expect(customLogger.info).toHaveBeenCalledWith("Plain message");
    });

    it("should pass the scope and metadata as the meta object", () => {
      configureLogger({ level: "debug" }, customLogger);

      logger("Engine").info("Starting", { jobId: 7 });

      expect(customLogger.info).toHaveBeenCalledWith("Starting", { scope: "Engine", jobId: 7 });
    });

    it("should map each level to the matching method", () => {
      configureLogger({ level: "silly" }, customLogger);
      const scoped = logger("Levels");

      scoped.error("e");
      scoped.warn("w");
      scoped.info("i");
      scoped.debug("d");
      scoped.verbose("v");
      scoped.silly("s");

      expect(customLogger.error).toHaveBeenCalledWith("e", { scope: "Levels" });
      expect(customLogger.warn).toHaveBeenCalledWith("w", { scope: "Levels" });
      expect(customLogger.info).toHaveBeenCalledWith("i", { scope: "Levels" });
      expect(customLogger.debug).toHaveBeenNthCalledWith(1, "d", { scope: "Levels" });
      expect(customLogger.debug).toHaveBeenNthCalledWith(2, "v", { scope: "Levels" });
      expect(customLogger.debug).toHaveBeenNthCalledWith(3, "s", { scope: "Levels" });
    });

    it("should only forward entries at or above the configured level", () => {
      configureLogger({ level: "warn" }, customLogger);

      logger("Filter").debug("hidden");
      logger("Filter").info("hidden");
      logger("Filter").warn("shown");

      expect(customLogger.debug).not.toHaveBeenCalled();
      expect(customLogger.info).not.toHaveBeenCalled();
      expect(customLogger.warn).toHaveBeenCalledWith("shown", { scope: "Filter" });
    });

    it("should keep the error message and stack", () => {
      configureLogger({ level: "debug" }, customLogger);
      const error = new Error("boom");

      logger("Backend").error("Migration failed:", error);
      logger("Worker").error(error);

      expect(customLogger.error).toHaveBeenNthCalledWith(1, "Migration failed: boom", {
        scope: "Backend",
        stack: error.stack,
      });
      expect(customLogger.error).toHaveBeenNthCalledWith(2, "boom", expect.objectContaining({ stack: error.stack }));
    });
  });

  describe("loadLoggerAdapter", () => {
    beforeEach(() => {
      pinoLines.length = 0;
    });

    afterEach(() => {
      configureLogger({ level: "info", json: false });
    });

    it("should keep the default console logger for winston", async () => {
      await expect(loadLoggerAdapter({ level: "info" })).resolves.toBeUndefined();
      await expect(loadLoggerAdapter({ level: "info", adapter: "winston" })).resolves.toBeUndefined();
    });

    it("should reject an unknown adapter", async () => {
      const unknown = { level: "info", adapter: "bunyan" } as unknown as LoggerOptions;
      const inherited = { level: "info", adapter: "toString" } as unknown as LoggerOptions;

      await expect(loadLoggerAdapter(unknown)).rejects.toThrow(
        'Unknown logger adapter "bunyan". Available adapters: "winston", "pino".',
      );
      await expect(loadLoggerAdapter(inherited)).rejects.toThrow('Unknown logger adapter "toString"');
    });

    it("should write entries through pino with the scope, metadata and options", async () => {
      const options: LoggerOptions = { level: "debug", adapter: "pino", options: { base: { app: "test" } } };
      configureLogger(options, await loadLoggerAdapter(options));

      logger("Engine").info("Starting", { jobId: 7 });
      logger().debug("No metadata");

      expect(pinoLines).toEqual([
        expect.objectContaining({ level: 30, msg: "Starting", scope: "Engine", jobId: 7, app: "test" }),
        expect.objectContaining({ level: 20, msg: "No metadata" }),
      ]);
    });

    it("should let logger.level decide what pino receives", async () => {
      const options: LoggerOptions = { level: "warn", adapter: "pino", options: { level: "error" } };
      configureLogger(options, await loadLoggerAdapter(options));

      logger("Queue").info("hidden");
      logger("Queue").warn("shown");

      expect(pinoLines).toEqual([expect.objectContaining({ level: 40, msg: "shown", scope: "Queue" })]);
    });

    it("should write errors through pino with their stack", async () => {
      const options: LoggerOptions = { level: "info", adapter: "pino" };
      configureLogger(options, await loadLoggerAdapter(options));
      const error = new Error("boom");

      logger("Backend").error("Migration failed:", error);

      expect(pinoLines).toEqual([
        expect.objectContaining({ level: 50, msg: "Migration failed: boom", scope: "Backend", stack: error.stack }),
      ]);
    });

    it("should serialize errors passed as metadata instead of writing them as {}", async () => {
      const options: LoggerOptions = { level: "info", adapter: "pino" };
      configureLogger(options, await loadLoggerAdapter(options));
      const error = new Error("boom");

      logger("MyJob").error("Job failed", { error, attempt: 2 });

      expect(pinoLines).toEqual([
        expect.objectContaining({
          msg: "Job failed",
          attempt: 2,
          error: expect.objectContaining({ type: "Error", message: "boom", stack: error.stack }) as unknown,
        }),
      ]);
    });

    it("should write to stdout synchronously, so worker threads do not hold entries back", async () => {
      pinoStreams.length = 0;

      await loadLoggerAdapter({ level: "info", adapter: "pino" });

      expect(pinoStreams).toEqual([expect.objectContaining({ fd: 1, sync: true })]);
    });

    it("should leave the output to the pino transport when one is set", async () => {
      pinoStreams.length = 0;

      await loadLoggerAdapter({
        level: "info",
        adapter: "pino",
        options: { transport: { target: "pino/file", options: { destination: 1 } } },
      });

      expect(pinoStreams).toEqual([undefined]);
    });

    it("should reject options that cannot be sent to the engine process and worker threads", async () => {
      const options: LoggerOptions = { level: "info", adapter: "pino", options: { timestamp: () => ',"time":0' } };

      await expect(loadLoggerAdapter(options)).rejects.toThrow('"logger.options" must be serializable');
    });

    it("should explain how to install pino when it is missing", async () => {
      vi.resetModules();
      vi.doMock("pino", () => {
        throw new Error("Cannot find package 'pino'");
      });
      try {
        const fresh = await import("./logger");

        await expect(fresh.loadLoggerAdapter({ level: "info", adapter: "pino" })).rejects.toThrow(
          'The "pino" logger adapter requires the "pino" package',
        );
      } finally {
        vi.doUnmock("pino");
      }
    });
  });
});
