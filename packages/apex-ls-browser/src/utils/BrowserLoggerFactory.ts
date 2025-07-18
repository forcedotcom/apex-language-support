/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { LoggerInterface, LoggerFactory, getLogNotificationHandler, shouldLog } from '@salesforce/apex-lsp-logging';
import type { LogMessageType } from '@salesforce/apex-lsp-logging';

/**
 * A browser logger implementation that sends log messages through the
 * configured LogNotificationHandler to the LSP client.
 */
class BrowserLogger implements LoggerInterface {
  /**
   * Logs a message with the specified type.
   * @param messageType The LSP message type.
   * @param messageOrProvider The message to log or a function that returns it.
   */
  public log(messageType: LogMessageType, messageOrProvider: string | (() => string)): void {
    // Check log level first
    if (!shouldLog(messageType)) {
      return;
    }

    const message = typeof messageOrProvider === 'function' ? messageOrProvider() : messageOrProvider;
    const handler = getLogNotificationHandler();

    if (handler && typeof handler.sendLogMessage === 'function') {
      // For backward compatibility, map Debug to Log for older LSP clients
      const mappedType = messageType === 'debug' ? 'log' : messageType;
      handler.sendLogMessage({
        type: mappedType,
        message,
      });
    } else {
      const fallbackType = messageType.toString();
      console.warn(
        '[BrowserLogger] LogNotificationHandler not available or invalid. ' +
          `Fallback log (${fallbackType}): ${message}`,
      );
    }
  }

  /**
   * Log a debug message
   * @param message - The message to log or function that returns the message
   */
  public debug(message: string | (() => string)): void {
    this.log('debug', message);
  }

  /**
   * Log an info message
   * @param message - The message to log or function that returns the message
   */
  public info(message: string | (() => string)): void {
    this.log('info', message);
  }

  /**
   * Log a warning message
   * @param message - The message to log or function that returns the message
   */
  public warn(message: string | (() => string)): void {
    this.log('warning', message);
  }

  /**
   * Log an error message
   * @param message - The message to log or function that returns the message
   */
  public error(message: string | (() => string)): void {
    this.log('error', message);
  }
}

/**
 * A logger factory that creates instances of BrowserLogger.
 * This ensures that loggers obtained via getLogger() will send
 * messages through the configured LogNotificationHandler to the LSP client.
 */
export class BrowserLoggerFactory implements LoggerFactory {
  private static loggerInstance: LoggerInterface | null = null;

  /**
   * Gets a singleton instance of the BrowserLogger.
   * @returns A Logger instance.
   */
  public getLogger(): LoggerInterface {
    BrowserLoggerFactory.loggerInstance ??= new BrowserLogger();
    return BrowserLoggerFactory.loggerInstance;
  }
}
