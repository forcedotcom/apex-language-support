/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { LogMessageType } from '@salesforce/apex-lsp-logging';

import { getLogNotificationHandler } from '../handlers/LogNotificationHandler';

/**
 * Bridge class that connects the parser's logging needs to the LSP layer
 * This class is responsible for converting internal log messages to LSP log notifications
 */
export class LoggingBridge {
  private static instance: LoggingBridge;

  private constructor() {
    // Private constructor to prevent instantiation
  }

  /**
   * Get the singleton instance of the logging bridge
   * @returns The logging bridge instance
   */
  public static getInstance(): LoggingBridge {
    if (!LoggingBridge.instance) {
      LoggingBridge.instance = new LoggingBridge();
    }
    return LoggingBridge.instance;
  }

  /**
   * Log a message through the LSP layer
   * @param messageType LSP message type
   * @param message Message to log
   */
  public log(messageType: LogMessageType, message: string): void {
    getLogNotificationHandler().sendLogMessage({
      type: messageType,
      message,
    });
  }
}
