/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import {
  getLogger,
  LogLevel,
  LoggerInterface,
} from '@salesforce/apex-lsp-logging';

/**
 * Test logger configuration for apex-parser-ast tests
 * This logger will output to the console during tests and can be configured
 * to show different log levels based on test needs
 */
export class TestLogger implements LoggerInterface {
  private static instance: TestLogger;
  private logger: LoggerInterface;
  private logLevel: LogLevel = LogLevel.Info;

  private constructor() {
    this.logger = getLogger();
  }

  /**
   * Get the singleton instance of the test logger
   */
  public static getInstance(): TestLogger {
    if (!TestLogger.instance) {
      TestLogger.instance = new TestLogger();
    }
    return TestLogger.instance;
  }

  /**
   * Set the log level for tests
   * @param level The log level to use
   */
  public setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  /**
   * Get the current log level
   */
  public getLogLevel(): LogLevel {
    return this.logLevel;
  }

  /**
   * Log a debug message
   */
  public debug(message: string | (() => string), ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.Debug)) {
      const actualMessage = typeof message === 'function' ? message() : message;
      this.logger.debug(actualMessage, ...args);
    }
  }

  /**
   * Log an info message
   */
  public info(message: string | (() => string), ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.Info)) {
      const actualMessage = typeof message === 'function' ? message() : message;
      this.logger.info(actualMessage, ...args);
    }
  }

  /**
   * Log a warning message
   */
  public warn(message: string | (() => string), ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.Warn)) {
      const actualMessage = typeof message === 'function' ? message() : message;
      this.logger.warn(actualMessage, ...args);
    }
  }

  /**
   * Log an error message
   */
  public error(
    message: string | (() => string),
    error?: unknown,
    ...args: unknown[]
  ): void {
    if (this.shouldLog(LogLevel.Error)) {
      const actualMessage = typeof message === 'function' ? message() : message;
      this.logger.error(actualMessage, error, ...args);
    }
  }

  /**
   * Log a message with the specified level
   */
  public log(
    level: LogLevel,
    message: string | (() => string),
    error?: unknown,
    ...args: unknown[]
  ): void {
    if (this.shouldLog(level)) {
      const actualMessage = typeof message === 'function' ? message() : message;
      this.logger.log(level, actualMessage, error, ...args);
    }
  }

  /**
   * Check if a message at the given level should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    const levels = [
      LogLevel.Error,
      LogLevel.Warn,
      LogLevel.Info,
      LogLevel.Debug,
    ];
    return levels.indexOf(level) <= levels.indexOf(this.logLevel);
  }
}
