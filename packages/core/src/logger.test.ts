import { beforeEach, describe, expect, it, vi } from "vitest";
import winston from "winston";
import { configureLogger, logger, LoggerOptions } from "./logger";

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
});
