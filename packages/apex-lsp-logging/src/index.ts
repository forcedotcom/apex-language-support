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
export const shouldLog = (messageType: LogMessageType): boolean => {
  // If messageType is not a valid LogMessageType number, treat as Log
  if (typeof messageType !== 'number' || !(messageType in LogMessageType)) {
    return LogMessageType.Log <= currentLogLevel;
  }
  return messageType <= currentLogLevel;
};

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
    const formatted = `[${timestamp}] [${typeString}] ${msg}`;
    switch (messageType) {
      case LogMessageType.Error:
        console.error(formatted);
        break;
      case LogMessageType.Warning:
        console.warn(formatted);
        break;
      case LogMessageType.Info:
        console.info(formatted);
        break;
      case LogMessageType.Log:
        console.log(formatted);
        break;
      case LogMessageType.Debug:
        console.debug(formatted);
        break;
      default:
        console.log(formatted);
        break;
    }
  }

  public debug(message: string | (() => string)): void {
    this.log(LogMessageType.Debug, message);
  }

  public info(message: string | (() => string)): void {
    this.log(LogMessageType.Info, message);
  }

  public warn(message: string | (() => string)): void {
    this.log(LogMessageType.Warning, message);
  }

  public error(message: string | (() => string)): void {
    this.log(LogMessageType.Error, message);
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
 * Get the current logger instance
 * @returns The current logger instance
 */
export const getLogger = (): LoggerInterface => loggerFactory.getLogger();

/**
 * Enable console logging with timestamps
 */
export const enableConsoleLogging = (): void => {
  setLoggerFactory(new ConsoleLoggerFactory());
};

/**
 * Disable all logging (set to no-op logger)
 */
export const disableLogging = (): void => {
  setLoggerFactory(new NoOpLoggerFactory());
};
