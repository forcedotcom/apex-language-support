/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/* eslint-disable @typescript-eslint/no-unused-vars */

export * from './notification';
export {
  LogMessageType,
  LogMessageParams,
  LogNotificationHandler,
  setLogNotificationHandler,
  getLogNotificationHandler,
} from './notification';

/**
 * Log levels supported by the logger
 */
export enum LogLevel {
  Error = 'error',
  Warn = 'warn',
  Info = 'info',
  Debug = 'debug',
}

/**
 * Interface for logging messages
 */
export interface LogMessage {
  level: LogLevel;
  message: string;
  error?: unknown;
}

/**
 * Interface for the logger implementation
 */
export interface Logger {
  /**
   * Log an error message
   * @param message - The message to log
   * @param error - Optional error object to include in the log
   */
  error(message: string, error?: unknown): void;

  /**
   * Log a warning message
   * @param message - The message to log
   */
  warn(message: string): void;

  /**
   * Log an info message
   * @param message - The message to log
   */
  info(message: string): void;

  /**
   * Log a debug message
   * @param message - The message to log
   */
  debug(message: string): void;

  /**
   * Log a message with the specified level
   * @param level - The log level
   * @param message - The message to log
   * @param error - Optional error object to include in the log
   */
  log(level: LogLevel, message: string, error?: unknown): void;
}

/**
 * Interface for the logger factory
 */
export interface LoggerFactory {
  /**
   * Get a logger instance
   * @returns A logger instance
   */
  getLogger(): Logger;
}

// Default no-op logger implementation
class NoOpLogger implements Logger {
  public error(_message: string, _error?: unknown): void {}
  public warn(_message: string): void {}
  public info(_message: string): void {}
  public debug(_message: string): void {}
  public log(_level: LogLevel, _message: string, _error?: unknown): void {}
}

// Default no-op logger factory
class NoOpLoggerFactory implements LoggerFactory {
  private static instance: Logger = new NoOpLogger();

  public getLogger(): Logger {
    return NoOpLoggerFactory.instance;
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
export const getLogger = (): Logger => loggerFactory.getLogger();
