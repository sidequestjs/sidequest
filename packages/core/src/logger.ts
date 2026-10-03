import { Writable } from "stream";
import { inspect } from "util";
import winston from "winston";

/**
 * Re-export of the Winston Logger type.
 */
export type Logger = winston.Logger;

/**
 * A logger that receives Sidequest's log entries instead of the console, such as the one
 * created for `adapter: "pino"`.
 *
 * Each method is called with the log message and, when the entry has any, an object with its
 * metadata (including the `scope` of the component that logged it).
 */
export interface SidequestLogger {
  /** Receives `error` entries. */
  error(message: string, meta?: Record<string, unknown>): void;
  /** Receives `warn` entries. */
  warn(message: string, meta?: Record<string, unknown>): void;
  /** Receives `info` entries. */
  info(message: string, meta?: Record<string, unknown>): void;
  /** Receives `debug` entries, and any other Winston level below `info`. */
  debug(message: string, meta?: Record<string, unknown>): void;
}

/**
 * Names accepted by `logger.adapter`.
 */
export type LoggerAdapterName = "winston" | "pino";

let _logger: Logger;

/**
 * Options for configuring the logger.
 */
export interface LoggerOptions {
  /** The minimum log level (e.g., 'info', 'debug', 'error'). */
  level: string;
  /** Whether to output logs in JSON format. */
  json?: boolean;
  /**
   * Which logger writes Sidequest's entries. `"winston"` (default) prints them to the console;
   * `"pino"` sends them to a pino logger and requires the `pino` package to be installed.
   */
  adapter?: LoggerAdapterName;
  /**
   * Options passed to `pino()` when `adapter` is `"pino"` (e.g. `base`, `redact`, `messageKey`).
   * They are sent to the engine process and worker threads, so they must be serializable.
   */
  options?: Record<string, unknown>;
}

/**
 * Creates the {@link SidequestLogger} for one adapter.
 */
type LoggerAdapterFactory = (options: LoggerOptions) => Promise<SidequestLogger>;

/**
 * Each adapter is a strategy for writing Sidequest's log entries. `"winston"` is the default and
 * needs no entry: its entries go straight to the console. To add an adapter, add its name to
 * {@link LoggerAdapterName} and its factory here.
 */
const loggerAdapters: Record<Exclude<LoggerAdapterName, "winston">, LoggerAdapterFactory> = {
  pino: createPinoLogger,
};

/**
 * Creates the logger selected by `options.adapter`. The engine calls this in every process and
 * worker thread; to change Sidequest's logger, set `logger.adapter` in the Sidequest config.
 * @param options Logger configuration options.
 * @returns The logger to pass to {@link configureLogger}, or `undefined` for the default
 * Winston console logger.
 * @throws {Error} When the adapter is unknown, its package is not installed, or
 * `options.options` is not serializable.
 */
export async function loadLoggerAdapter(options: LoggerOptions): Promise<SidequestLogger | undefined> {
  const name = options.adapter ?? "winston";
  if (name === "winston") {
    return undefined;
  }
  if (!Object.hasOwn(loggerAdapters, name)) {
    const available = ["winston", ...Object.keys(loggerAdapters)].map((adapter) => `"${adapter}"`).join(", ");
    throw new Error(`Unknown logger adapter "${String(name)}". Available adapters: ${available}.`);
  }
  try {
    structuredClone(options.options);
  } catch (error) {
    throw new Error(
      `"logger.options" must be serializable, because Sidequest sends them to the engine process and worker ` +
        `threads. Remove functions such as "timestamp", "mixin", "formatters", "serializers" or "hooks".`,
      { cause: error },
    );
  }
  return loggerAdapters[name](options);
}

/**
 * Creates a pino logger from `options.options`, wrapped as a {@link SidequestLogger} because pino
 * takes `(obj, msg)` instead of `(message, meta)`.
 * @param options Logger configuration options.
 * @returns The pino-backed logger.
 * @throws {Error} When the `pino` package is not installed.
 */
async function createPinoLogger(options: LoggerOptions): Promise<SidequestLogger> {
  const { default: pino } = await import("pino").catch((error: unknown) => {
    throw new Error(`The "pino" logger adapter requires the "pino" package. Install it with "npm install pino".`, {
      cause: error,
    });
  });
  // pino writes to stdout asynchronously by default, and a worker thread blocked waiting for its next
  // job never gets to flush. Write synchronously, unless a transport handles the output.
  const destination = options.options?.transport ? undefined : pino.destination({ dest: 1, sync: true });
  // Winston already filters by `options.level`, so pino logs every entry it receives.
  const log = pino({ ...options.options, level: "trace" }, destination);
  // pino writes an Error inside the bindings object as `{}`, so serialize it like pino's `err`.
  const bindings = (meta?: Record<string, unknown>) =>
    Object.fromEntries(
      Object.entries(meta ?? {}).map(([key, value]) => [
        key,
        value instanceof Error ? pino.stdSerializers.err(value) : value,
      ]),
    );
  return {
    error: (message, meta) => log.error(bindings(meta), message),
    warn: (message, meta) => log.warn(bindings(meta), message),
    info: (message, meta) => log.info(bindings(meta), message),
    debug: (message, meta) => log.debug(bindings(meta), message),
  };
}

/**
 * Configures and creates a Winston logger for Sidequest.
 * @param options Logger configuration options.
 * @param customLogger Optional logger that receives every entry instead of the console. When set,
 * `options.json` is ignored and `options.level` still filters which entries are sent. The engine
 * passes the logger from {@link loadLoggerAdapter} here in every process and worker thread.
 * @returns The configured Winston logger instance.
 */
export function configureLogger(options: LoggerOptions, customLogger?: SidequestLogger) {
  if (customLogger) {
    _logger = winston.createLogger({
      level: options.level,
      format: winston.format.errors({ stack: true }),
      transports: [forwardTo(customLogger)],
    });
    return _logger;
  }

  const colors = {
    error: "red",
    warn: "yellow",
    info: "green",
    verbose: "cyan",
    debug: "blue",
    silly: "magenta",
  };

  winston.addColors(colors);

  const newLogger = winston.createLogger({
    level: options.level,
    format: buildFormat(),
    transports: [new winston.transports.Console()],
  });

  /**
   * Builds the log format based on options.
   * @returns The Winston log format.
   */
  function buildFormat() {
    if (options.json) {
      return winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.label({ label: "Sidequest" }),
        winston.format.json(),
      );
    }

    return winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
      winston.format.errors({ stack: true }),
      winston.format.label({ label: "Sidequest" }),
      winston.format.printf(({ timestamp, level, message, label, stack, scope, ...metadata }) => {
        const metaStr = Object.keys(metadata).length ? `\n${inspect(metadata)}` : "";
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        const base = `[${level}] [${timestamp}] [${label}] ${scope ? `[${scope as string}] ` : ""}: ${message}${metaStr}`;
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions, @typescript-eslint/no-base-to-string
        return stack ? `${base}\n${stack}` : base;
      }),
    );
  }

  _logger = newLogger;
  return newLogger;
}

/**
 * Builds a Winston transport that forwards each log entry to a {@link SidequestLogger}.
 * @param target The logger that receives the entries.
 * @returns A Winston stream transport in object mode.
 */
function forwardTo(target: SidequestLogger) {
  const stream = new Writable({
    objectMode: true,
    write(info: winston.Logform.TransformableInfo, _encoding, callback) {
      const { level, message, ...rest } = info;
      // Object.keys skips Winston's internal symbol keys (level, splat, formatted message).
      const meta = Object.fromEntries(Object.keys(rest).map((key) => [key, rest[key]]));
      const method = level === "error" || level === "warn" || level === "info" ? level : "debug";
      if (Object.keys(meta).length > 0) {
        target[method](String(message), meta);
      } else {
        target[method](String(message));
      }
      callback();
    },
  });
  return new winston.transports.Stream({ stream });
}

// Default logger instance for Sidequest.
_logger = configureLogger({ level: "info", json: false });

/**
 * Returns the default logger instance.
 * @returns The Winston logger instance.
 */
export function logger(scope?: string): Logger {
  return scope ? _logger.child({ scope }) : _logger;
}
