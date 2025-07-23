
import winston from 'winston';

let _logger: winston.Logger;

export type LoggerOptions =  {
  level: string,
  json?: boolean
}

export function configureLogger(options: LoggerOptions){
  const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    verbose: 'cyan',
    debug: 'blue',
    silly: 'magenta',
  };
  
  winston.addColors(colors);
  
  const newLogger = winston.createLogger({
    level: 'debug',
    format: buildFormat(),
    transports: [new winston.transports.Console()],
  });
  
  function buildFormat(){
    if(options.json){
      return winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.label({ label: 'Sidequest' }),
        winston.format.json()
      )
    }
  
    return winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.label({ label: 'Sidequest' }),
      winston.format.printf(({ timestamp, level, message, label, stack }) => {
        return stack
          ? `[${timestamp}] [${label}] ${level}: ${message}\n${stack}`
          : `[${timestamp}] [${label}] ${level}: ${message}`;
      })
    )
  }

  _logger = newLogger;
  return newLogger;
}

_logger = configureLogger({ level: 'info', json: false});

export default function logger(): winston.Logger{
  return _logger;
}
