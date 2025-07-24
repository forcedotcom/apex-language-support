/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import {
  getLogger,
  type LogMessageType,
  LoggerInterface,
} from '@salesforce/apex-lsp-shared';

/**
 * Test logger configuration for apex-parser-ast tests
 * This logger will output to the console during tests and can be configured
 * to show different log levels based on test needs
 */
export class TestLogger implements LoggerInterface {
  private static instance: TestLogger;
  private logger: LoggerInterface;
  private logLevel: LogMessageType = 'info';

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
  public setLogLevel(level: LogMessageType): void {
    this.logLevel = level;
  }

  /**
   * Get the current log level
   */
  public getLogLevel(): LogMessageType {
    return this.logLevel;
  }

  /**
   * Log a message with the specified type
   */
  public log(
    messageType: LogMessageType,
    message: string | (() => string),
  ): void {
    if (this.shouldLog(messageType)) {
      if (typeof message === 'function') {
        this.logger.log(messageType, message);
      } else {
        this.logger.log(messageType, message);
      }
    }
  }

  /**
   * Log a debug message
   * @param message - The message to log or function that returns the message
   */
  public debug(message: string | (() => string)): void {
    if (this.shouldLog('debug')) {
      if (typeof message === 'function') {
        this.logger.log('debug', message);
      } else {
        this.logger.log('debug', message);
      }
    }
  }

  /**
   * Log an info message
   * @param message - The message to log or function that returns the message
   */
  public info(message: string | (() => string)): void {
    if (this.shouldLog('info')) {
      if (typeof message === 'function') {
        this.logger.log('info', message);
      } else {
        this.logger.log('info', message);
      }
    }
  }

  /**
   * Log a warning message
   * @param message - The message to log or function that returns the message
   */
  public warn(message: string | (() => string)): void {
    if (this.shouldLog('warning')) {
      if (typeof message === 'function') {
        this.logger.log('warning', message);
      } else {
        this.logger.log('warning', message);
      }
    }
  }

  /**
   * Log an error message
   * @param message - The message to log or function that returns the message
   */
  public error(message: string | (() => string)): void {
    if (this.shouldLog('error')) {
      if (typeof message === 'function') {
        this.logger.log('error', message);
      } else {
        this.logger.log('error', message);
      }
    }
  }

  /**
   * Check if a message at the given level should be logged
   */
  private shouldLog(level: LogMessageType): boolean {
    const levels: LogMessageType[] = [
      'error',
      'warning',
      'info',
      'log',
      'debug',
    ];
    return levels.indexOf(level) <= levels.indexOf(this.logLevel);
  }
}
