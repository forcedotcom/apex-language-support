/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  LoggerInterface,
  LoggerFactory,
  LogMessageType,
  getLogNotificationHandler,
} from '@salesforce/apex-lsp-logging';

/**
 * An active logger implementation that sends log messages through the
 * configured LogNotificationHandler.
 */
class ActiveLogger implements LoggerInterface {
  /**
   * Logs a message with the specified type.
   * @param messageType The LSP message type.
   * @param messageOrProvider The message to log or a function that returns it.
   */
  public log(
    messageType: LogMessageType,
    messageOrProvider: string | (() => string),
  ): void {
    const message =
      typeof messageOrProvider === 'function'
        ? messageOrProvider()
        : messageOrProvider;
    const handler = getLogNotificationHandler();

    if (handler && typeof handler.sendLogMessage === 'function') {
      // For backward compatibility, map Debug to Log for older LSP clients
      const mappedType =
        messageType === LogMessageType.Debug ? LogMessageType.Log : messageType;
      handler.sendLogMessage({
        type: mappedType,
        message,
      });
    } else {
      const fallbackType = messageType.toString();
      console.warn(
        '[ActiveLogger] LogNotificationHandler not available or invalid. ' +
          `Fallback log (${fallbackType}): ${message}`,
      );
    }
  }
}

/**
 * A logger factory that creates instances of ActiveLogger.
 * This ensures that loggers obtained via getLogger() will actively send
 * messages through the configured LogNotificationHandler.
 */
export class ActiveLoggerFactory implements LoggerFactory {
  private static loggerInstance: LoggerInterface | null = null;

  /**
   * Gets a singleton instance of the ActiveLogger.
   * @returns A Logger instance.
   */
  public getLogger(): LoggerInterface {
    if (!ActiveLoggerFactory.loggerInstance) {
      ActiveLoggerFactory.loggerInstance = new ActiveLogger();
    }
    return ActiveLoggerFactory.loggerInstance;
  }
}
