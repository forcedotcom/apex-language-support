/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

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
 * Currently using console.error, console.warn, console.info, and console.log
 * TODO: W-18467153 Replace with a more sophisticated logging library
 * Logger class that handles logging for lsp-compliant-services
 */
export class Logger {
  private static instance: Logger;

  private constructor() {
    // Private constructor to prevent instantiation
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
  public error(message: string, error?: unknown): void {
    const errorMessage = error ? `${message}: ${error}` : message;
    console.error(errorMessage);
  }

  /**
   * Log a warning message
   * @param message - The message to log
   */
  public warn(message: string): void {
    console.warn(message);
  }

  /**
   * Log an info message
   * @param message - The message to log
   */
  public info(message: string): void {
    console.info(message);
  }

  /**
   * Log a debug message
   * @param message - The message to log
   */
  public debug(message: string): void {
    console.log(message);
  }

  /**
   * Log a message with the specified level
   * @param level - The log level
   * @param message - The message to log
   * @param error - Optional error object to include in the log
   */
  public log(level: LogLevel, message: string, error?: unknown): void {
    switch (level) {
      case LogLevel.Error:
        this.error(message, error);
        break;
      case LogLevel.Warn:
        this.warn(message);
        break;
      case LogLevel.Info:
        this.info(message);
        break;
      case LogLevel.Debug:
        this.debug(message);
        break;
    }
  }
}
