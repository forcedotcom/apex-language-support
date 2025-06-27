/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { LogMessageType, LoggerInterface } from '@salesforce/apex-lsp-logging';

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
   * Log a message with the specified type
   * @param messageType - The LSP message type
   * @param message - The message to log
   */
  public log(
    messageType: LogMessageType,
    message: string | (() => string),
  ): void {
    const actualMessage = typeof message === 'function' ? message() : message;

    // Log to console based on message type
    switch (messageType) {
      case LogMessageType.Error:
        console.error(actualMessage);
        break;
      case LogMessageType.Warning:
        console.warn(actualMessage);
        break;
      case LogMessageType.Info:
        console.info(actualMessage);
        break;
      case LogMessageType.Log:
      case LogMessageType.Debug:
        console.log(actualMessage);
        break;
    }

    // Send to LSP layer
    this.loggingBridge.log(messageType, actualMessage);
  }
}
