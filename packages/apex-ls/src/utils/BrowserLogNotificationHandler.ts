/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { Connection } from 'vscode-languageserver/browser';
import type {
  LogNotificationHandler as ILogNotificationHandler,
  LogMessageParams,
} from '@salesforce/apex-lsp-shared';
import {
  shouldLog,
  logMessageTypeToLspNumber,
} from '@salesforce/apex-lsp-shared';

/**
 * Log notification handler that works in both browser and web worker contexts
 *
 * This handler can send log notifications through multiple channels:
 * 1. LSP connection via window/logMessage (browser context)
 * 2. LSP connection via $/log (web worker context)
 * 3. postMessage to main thread (web worker context)
 * 4. Console fallback (when neither is available)
 */
export class LogNotificationHandler implements ILogNotificationHandler {
  private static browserInstance: LogNotificationHandler;
  private static workerInstance: LogNotificationHandler;
  private connection: Connection | null = null;

  private constructor() {
    // constructor since postMessage functionality is not used
  }

  /**
   * Gets the singleton instance for browser context
   */
  static getBrowserInstance(connection: Connection): LogNotificationHandler {
    if (!LogNotificationHandler.browserInstance) {
      LogNotificationHandler.browserInstance = new LogNotificationHandler();
    }
    LogNotificationHandler.browserInstance.connection = connection;
    return LogNotificationHandler.browserInstance;
  }

  /**
   * Gets the singleton instance for web worker context
   */
  static getWorkerInstance(connection?: Connection): LogNotificationHandler {
    if (!LogNotificationHandler.workerInstance) {
      LogNotificationHandler.workerInstance = new LogNotificationHandler();
    }
    if (connection) {
      LogNotificationHandler.workerInstance.connection = connection;
    }
    return LogNotificationHandler.workerInstance;
  }

  /**
   * Reset instances (for testing only)
   */
  static resetInstances(): void {
    LogNotificationHandler.browserInstance = undefined as any;
    LogNotificationHandler.workerInstance = undefined as any;
  }

  /**
   * Send a log message to the language client
   */
  sendLogMessage(params: LogMessageParams): void {
    // Check if we should log this message based on current log level
    if (!shouldLog(params.type)) {
      return; // Don't log if below current log level
    }

    // Send via LSP connection if available
    this.sendViaLsp(params);

    // Note: postMessage functionality removed as it's blocked in VS Code web worker environment
  }

  /**
   * Sends log message via LSP connection
   */
  private sendViaLsp(params: LogMessageParams): void {
    if (!this.connection) {
      return;
    }

    try {
      // Convert to numeric LSP MessageType
      // VS Code's built-in handler will add timestamp and log level prefix
      const lspMessageType = logMessageTypeToLspNumber(params.type);
      this.connection.sendNotification('window/logMessage', {
        type: lspMessageType,
        message: params.message,
      });
    } catch {
      // If LSP notification fails, silently continue - no need to log errors about logging
    }
  }
}
