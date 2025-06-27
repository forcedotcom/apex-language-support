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
import type { LogMessageType } from './notification';

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
