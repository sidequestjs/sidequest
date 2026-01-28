import { inspect } from "util";
import winston from "winston";

/**
 * Re-export of the Winston Logger type.
 */
export type Logger = winston.Logger;

let _logger: Logger;

/**
 * Options for configuring the logger.
 */
export interface LoggerOptions {
  /** The minimum log level (e.g., 'info', 'debug', 'error'). */
  level: string;
  /** Whether to output logs in JSON format. */
  json?: boolean;
}

/**
 * Configures and creates a Winston logger for Sidequest.
 * @param options Logger configuration options.
 * @returns The configured Winston logger instance.
 */
export function configureLogger(options: LoggerOptions) {
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

// Default logger instance for Sidequest.
_logger = configureLogger({ level: "info", json: false });

/**
 * Returns the default logger instance.
 * @returns The Winston logger instance.
 */
export function logger(scope?: string): Logger {
  return scope ? _logger.child({ scope }) : _logger;
}
