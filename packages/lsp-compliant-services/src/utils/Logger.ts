/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  LogLevel,
  Logger as LoggerInterface,
} from '@salesforce/apex-lsp-logging';

import { LoggingBridge } from './LoggingBridge';

/**
 * Logger class that handles logging for lsp-compliant-services
 * Logs are sent to both the console and the language client via LSP notifications
 */
export class Logger implements LoggerInterface {
  private static instance: Logger;
  private readonly loggingBridge: LoggingBridge;

  private constructor() {
    this.loggingBridge = LoggingBridge.getInstance();
  }

  /**
   * Get the singleton instance of the logger
   * @returns The logger instance
   */
  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * Log an error message
   * @param message - The message to log
   * @param error - Optional error object to include in the log
   */
  public error(message: string | (() => string), error?: unknown): void {
    const actualMessage = typeof message === 'function' ? message() : message;
    const errorMessage = error ? `${actualMessage}: ${error}` : actualMessage;
    console.error(errorMessage);
    this.loggingBridge.log(LogLevel.Error, actualMessage, error);
  }

  /**
   * Log a warning message
   * @param message - The message to log
   */
  public warn(message: string | (() => string)): void {
    const actualMessage = typeof message === 'function' ? message() : message;
    console.warn(actualMessage);
    this.loggingBridge.log(LogLevel.Warn, actualMessage);
  }

  /**
   * Log an info message
   * @param message - The message to log
   */
  public info(message: string | (() => string)): void {
    const actualMessage = typeof message === 'function' ? message() : message;
    console.info(actualMessage);
    this.loggingBridge.log(LogLevel.Info, actualMessage);
  }

  /**
   * Log a debug message
   * @param message - The message to log
   */
  public debug(message: string | (() => string)): void {
    const actualMessage = typeof message === 'function' ? message() : message;
    console.log(actualMessage);
    this.loggingBridge.log(LogLevel.Debug, actualMessage);
  }

  /**
   * Log a message with the specified level
   * @param level - The log level
   * @param message - The message to log
   * @param error - Optional error object to include in the log
   */
  public log(
    level: LogLevel,
    message: string | (() => string),
    error?: unknown,
  ): void {
    const actualMessage = typeof message === 'function' ? message() : message;
    switch (level) {
      case LogLevel.Error:
        this.error(actualMessage, error);
        break;
      case LogLevel.Warn:
        this.warn(actualMessage);
        break;
      case LogLevel.Info:
        this.info(actualMessage);
        break;
      case LogLevel.Debug:
        this.debug(actualMessage);
        break;
    }
  }
}
