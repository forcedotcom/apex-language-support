/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { LogMessageType } from './notification';

/**
 * Priority mapping for log levels (higher number = higher priority)
 */
const LOG_LEVEL_PRIORITY: Record<LogMessageType, number> = {
  error: 5,
  warning: 4,
  info: 3,
  log: 2,
  debug: 1,
};

/**
 * Convert string log level to LogMessageType
 * @param level String representation of log level
 * @returns LogMessageType string value
 */
const stringToLogLevel = (level: string): LogMessageType => {
  switch (level.toLowerCase()) {
    case 'error':
      return 'error';
    case 'warn':
    case 'warning':
      return 'warning';
    case 'info':
      return 'info';
    case 'log':
      return 'log';
    case 'debug':
      return 'debug';
    default:
      return 'info'; // Default to info
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
let currentLogLevel: LogMessageType = 'error';

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
  const messagePriority =
    LOG_LEVEL_PRIORITY[messageType] || LOG_LEVEL_PRIORITY.log;
  const currentPriority = LOG_LEVEL_PRIORITY[currentLogLevel];
  return messagePriority >= currentPriority;
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
    messageType: LogMessageType,
    message: string | (() => string),
  ): void {
    // No-op implementation - does nothing
  }

  public debug(message: string | (() => string)): void {
    // No-op implementation - does nothing
  }

  public info(message: string | (() => string)): void {
    // No-op implementation - does nothing
  }

  public warn(message: string | (() => string)): void {
    // No-op implementation - does nothing
  }

  public error(message: string | (() => string)): void {
    // No-op implementation - does nothing
  }
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
      case 'error':
        return 'ERROR';
      case 'warning':
        return 'WARN';
      case 'info':
        return 'INFO';
      case 'log':
        return 'LOG';
      case 'debug':
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
      case 'error':
        console.error(formatted);
        break;
      case 'warning':
        console.warn(formatted);
        break;
      case 'info':
        console.info(formatted);
        break;
      case 'log':
        console.log(formatted);
        break;
      case 'debug':
        console.debug(formatted);
        break;
      default:
        console.log(formatted);
        break;
    }
  }

  public debug(message: string | (() => string)): void {
    this.log('debug', message);
  }

  public info(message: string | (() => string)): void {
    this.log('info', message);
  }

  public warn(message: string | (() => string)): void {
    this.log('warning', message);
  }

  public error(message: string | (() => string)): void {
    this.log('error', message);
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
