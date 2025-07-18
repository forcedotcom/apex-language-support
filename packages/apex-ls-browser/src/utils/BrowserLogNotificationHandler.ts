/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Connection, MessageType } from 'vscode-languageserver/browser';
import { LogMessageParams, LogNotificationHandler, shouldLog } from '@salesforce/apex-lsp-logging';
import type { LogMessageType } from '@salesforce/apex-lsp-logging';

/**
 * Browser-specific implementation of LogNotificationHandler
 * Sends log messages to both the console and the language client
 */
export class BrowserLogNotificationHandler implements LogNotificationHandler {
  private static instance: BrowserLogNotificationHandler | undefined;
  private connection: Connection;

  private constructor(connection: Connection) {
    this.connection = connection;
  }

  /**
   * Get the singleton instance of the BrowserLogNotificationHandler
   * @param connection The LSP connection to use for sending notifications
   * @returns The BrowserLogNotificationHandler instance
   */
  public static getInstance(connection: Connection): BrowserLogNotificationHandler {
    if (!BrowserLogNotificationHandler.instance) {
      BrowserLogNotificationHandler.instance = new BrowserLogNotificationHandler(connection);
    }
    return BrowserLogNotificationHandler.instance;
  }

  /**
   * Reset the singleton instance (for testing only)
   */
  public static resetInstance(): void {
    BrowserLogNotificationHandler.instance = undefined;
  }

  /**
   * Send a log message to the language client
   * @param params The log message parameters
   */
  public sendLogMessage(params: LogMessageParams): void {
    // Check if we should log this message based on current log level
    if (!shouldLog(params.type)) {
      return; // Don't log if below current log level
    }

    // Send to language client only - let the client handle OutputChannel logging
    this.connection.sendNotification('window/logMessage', {
      type: this.getLogMessageType(params.type),
      message: params.message,
    });
  }

  /**
   * Convert internal log type to LSP message type
   * @param type The internal log type
   * @returns The corresponding LSP message type
   */
  private getLogMessageType(type: LogMessageType): MessageType {
    switch (type) {
      case 'error':
        return MessageType.Error;
      case 'warning':
        return MessageType.Warning;
      case 'info':
        return MessageType.Info;
      case 'log':
        return MessageType.Log;
      case 'debug':
        // Map Debug to Log for backward compatibility with older LSP clients
        return MessageType.Log;
      default:
        return MessageType.Log;
    }
  }
}
