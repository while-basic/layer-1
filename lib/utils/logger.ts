/**
 * Simple structured logging utility
 */

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

export function log(level: LogLevel, message: string, meta?: any) {
  const timestamp = new Date().toISOString()
  const logEntry = {
    timestamp,
    level,
    message,
    ...meta,
  }

  switch (level) {
    case LogLevel.ERROR:
      console.error(JSON.stringify(logEntry))
      break
    case LogLevel.WARN:
      console.warn(JSON.stringify(logEntry))
      break
    case LogLevel.DEBUG:
      console.debug(JSON.stringify(logEntry))
      break
    case LogLevel.INFO:
    default:
      console.log(JSON.stringify(logEntry))
      break
  }
}

export const logger = {
  debug: (message: string, meta?: any) => log(LogLevel.DEBUG, message, meta),
  info: (message: string, meta?: any) => log(LogLevel.INFO, message, meta),
  warn: (message: string, meta?: any) => log(LogLevel.WARN, message, meta),
  error: (message: string, meta?: any) => log(LogLevel.ERROR, message, meta),
}
