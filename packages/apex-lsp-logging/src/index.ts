/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

export * from './notification';
export {
  LogMessageType,
  setLogNotificationHandler,
  getLogNotificationHandler,
} from './notification';
export type { LogMessageParams, LogNotificationHandler } from './notification';
import { LogMessageType } from './notification';

/**
 * Convert string log level to LogMessageType
 * @param level String representation of log level
 * @returns LogMessageType enum value
 */
export const stringToLogLevel = (level: string): LogMessageType => {
  switch (level.toLowerCase()) {
    case 'error':
      return LogMessageType.Error;
    case 'warn':
    case 'warning':
      return LogMessageType.Warning;
    case 'info':
      return LogMessageType.Info;
    case 'log':
      return LogMessageType.Log;
    case 'debug':
      return LogMessageType.Debug;
    default:
      return LogMessageType.Info; // Default to info
  }
};

/**
 * Convert LogMessageType to LogLevel
 * @param messageType The log message type
 * @returns Corresponding log level
 */
export const messageTypeToLogLevel = (
  messageType: LogMessageType,
): LogMessageType => messageType;

// Global log level setting
let currentLogLevel: LogMessageType = LogMessageType.Error;

/**
 * Set the global log level
 * @param level The log level to set
 */
export const setLogLevel = (level: LogMessageType | string): void => {
  currentLogLevel = typeof level === 'string' ? stringToLogLevel(level) : level;
};

/**
 * Get the current global log level
 * @returns The current log level
 */
export const getLogLevel = (): LogMessageType => currentLogLevel;

/**
 * Check if a message type should be logged based on current log level
 * @param messageType The message type to check
 * @returns True if the message should be logged
 */
export const shouldLog = (messageType: LogMessageType): boolean =>
  messageType <= currentLogLevel;

/**
 * Interface for the logger implementation
 * Aligned with LSP window/logMessage structure while providing convenience methods
 */
export interface LoggerInterface {
  /**
   * Log a message with the specified type
   * @param messageType - The LSP message type (Error, Warning, Info, Log, Debug)
   * @param message - The message to log
   */
  log(messageType: LogMessageType, message: string): void;

  /**
   * Log a message with lazy evaluation
   * @param messageType - The LSP message type (Error, Warning, Info, Log, Debug)
   * @param messageProvider - Function that returns the message to log
   */
  log(messageType: LogMessageType, messageProvider: () => string): void;

  /**
   * Log a debug message
   * @param message - The message to log
   */
  debug(message: string): void;

  /**
   * Log a debug message with lazy evaluation
   * @param messageProvider - Function that returns the message to log
   */
  debug(messageProvider: () => string): void;

  /**
   * Log an info message
   * @param message - The message to log
   */
  info(message: string): void;

  /**
   * Log an info message with lazy evaluation
   * @param messageProvider - Function that returns the message to log
   */
  info(messageProvider: () => string): void;

  /**
   * Log a warning message
   * @param message - The message to log
   */
  warn(message: string): void;

  /**
   * Log a warning message with lazy evaluation
   * @param messageProvider - Function that returns the message to log
   */
  warn(messageProvider: () => string): void;

  /**
   * Log an error message
   * @param message - The message to log
   */
  error(message: string): void;

  /**
   * Log an error message with lazy evaluation
   * @param messageProvider - Function that returns the message to log
   */
  error(messageProvider: () => string): void;
}

/**
 * Interface for the logger factory
 */
export interface LoggerFactory {
  /**
   * Get a logger instance
   * @returns A logger instance
   */
  getLogger(): LoggerInterface;
}

// Default no-op logger implementation
class NoOpLogger implements LoggerInterface {
  public log(
    _messageType: LogMessageType,
    _message: string | (() => string),
  ): void {}

  public debug(_message: string | (() => string)): void {}

  public info(_message: string | (() => string)): void {}

  public warn(_message: string | (() => string)): void {}

  public error(_message: string | (() => string)): void {}
}

// Default no-op logger factory
class NoOpLoggerFactory implements LoggerFactory {
  private static instance: LoggerInterface = new NoOpLogger();

  public getLogger(): LoggerInterface {
    return NoOpLoggerFactory.instance;
  }
}

// Console logger implementation for standalone usage
class ConsoleLogger implements LoggerInterface {
  /**
   * Convert LogMessageType enum to string representation
   * @param messageType The log message type enum value
   * @returns String representation of the message type
   */
  private getMessageTypeString(messageType: LogMessageType): string {
    switch (messageType) {
      case LogMessageType.Error:
        return 'ERROR';
      case LogMessageType.Warning:
        return 'WARN';
      case LogMessageType.Info:
        return 'INFO';
      case LogMessageType.Log:
        return 'LOG';
      case LogMessageType.Debug:
        return 'DEBUG';
      default:
        return 'UNKNOWN';
    }
  }

  public log(
    messageType: LogMessageType,
    message: string | (() => string),
  ): void {
    if (!shouldLog(messageType)) {
      return;
    }

    const msg = typeof message === 'function' ? message() : message;
    const timestamp = new Date().toISOString();
    const typeString = this.getMessageTypeString(messageType);
    switch (messageType) {
      case LogMessageType.Error:
        console.error(`[${timestamp}] [${typeString}] ${msg}`);
        break;
      case LogMessageType.Warning:
        console.warn(`[${timestamp}] [${typeString}] ${msg}`);
        break;
      case LogMessageType.Info:
        console.info(`[${timestamp}] [${typeString}] ${msg}`);
        break;
      case LogMessageType.Log:
        console.log(`[${timestamp}] [${typeString}] ${msg}`);
        break;
      case LogMessageType.Debug:
        console.debug(`[${timestamp}] [${typeString}] ${msg}`);
        break;
      default:
        console.log(`[${timestamp}] [${typeString}] ${msg}`);
        break;
    }
  }

  public debug(message: string | (() => string)): void {
    if (!shouldLog(LogMessageType.Debug)) {
      return;
    }
    const msg = typeof message === 'function' ? message() : message;
    const timestamp = new Date().toISOString();
    console.debug(`[${timestamp}] [DEBUG] ${msg}`);
  }

  public info(message: string | (() => string)): void {
    if (!shouldLog(LogMessageType.Info)) {
      return;
    }
    const msg = typeof message === 'function' ? message() : message;
    const timestamp = new Date().toISOString();
    console.info(`[${timestamp}] [INFO] ${msg}`);
  }

  public warn(message: string | (() => string)): void {
    if (!shouldLog(LogMessageType.Warning)) {
      return;
    }
    const msg = typeof message === 'function' ? message() : message;
    const timestamp = new Date().toISOString();
    console.warn(`[${timestamp}] [WARN] ${msg}`);
  }

  public error(message: string | (() => string)): void {
    if (!shouldLog(LogMessageType.Error)) {
      return;
    }
    const msg = typeof message === 'function' ? message() : message;
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] [ERROR] ${msg}`);
  }
}

// Console logger factory for standalone usage
class ConsoleLoggerFactory implements LoggerFactory {
  private static instance: LoggerInterface = new ConsoleLogger();

  public getLogger(): LoggerInterface {
    return ConsoleLoggerFactory.instance;
  }
}

// Global logger factory instance
let loggerFactory: LoggerFactory = new NoOpLoggerFactory();

/**
 * Set the logger factory
 * @param factory The logger factory to use
 */
export const setLoggerFactory = (factory: LoggerFactory): void => {
  loggerFactory = factory;
};

/**
 * Get the current logger factory
 * @returns The current logger factory
 */
export const getLoggerFactory = (): LoggerFactory => loggerFactory;

/**
 * Get the current logger instance
 * @returns The current logger instance
 */
export const getLogger = (): LoggerInterface => loggerFactory.getLogger();

/**
 * Enable console logging for standalone usage
 * This sets up a console logger with timestamps for use outside of LSP contexts
 */
export const enableConsoleLogging = (): void => {
  setLoggerFactory(new ConsoleLoggerFactory());
};

/**
 * Disable logging (set to no-op logger)
 * This is useful for production environments where logging is not needed
 */
export const disableLogging = (): void => {
  setLoggerFactory(new NoOpLoggerFactory());
};
