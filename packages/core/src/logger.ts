import winston from "winston";

let _logger: winston.Logger;

export interface LoggerOptions {
  level: string;
  json?: boolean;
}

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
    level: "debug",
    format: buildFormat(),
    transports: [new winston.transports.Console()],
  });

  function buildFormat() {
    const addProcessInfo = winston.format((info) => {
      info.pid = process.pid;
      return info;
    });

    if (options.json) {
      return winston.format.combine(
        addProcessInfo(),
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.label({ label: "Sidequest" }),
        winston.format.json(),
      );
    }

    return winston.format.combine(
      addProcessInfo(),
      winston.format.colorize(),
      winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
      winston.format.errors({ stack: true }),
      winston.format.label({ label: "Sidequest" }),
      winston.format.printf(({ timestamp, level, message, label, stack, pid, ...metadata }) => {
        const metaStr = Object.keys(metadata).length ? `\n${JSON.stringify(metadata, null, 2)}` : "";
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        const base = `[${level}] [${timestamp}] [pid:${pid}] [${label}] : ${message}${metaStr}`;
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions, @typescript-eslint/no-base-to-string
        return stack ? `${base}\n${stack}` : base;
      }),
    );
  }

  _logger = newLogger;
  return newLogger;
}

_logger = configureLogger({ level: "info", json: false });

export function logger(): winston.Logger {
  return _logger;
}
