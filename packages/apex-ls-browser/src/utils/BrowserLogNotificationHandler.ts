/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { Connection } from 'vscode-languageserver/browser';
import { MessageType } from 'vscode-languageserver/browser';
import type {
  LogNotificationHandler,
  LogMessageParams,
} from '@salesforce/apex-lsp-shared';
import { shouldLog } from '@salesforce/apex-lsp-shared';

/**
 * Unified log notification handler that works in both browser and web worker contexts
 *
 * This handler can send log notifications through multiple channels:
 * 1. LSP connection via window/logMessage (browser context)
 * 2. LSP connection via $/log (web worker context)
 * 3. postMessage to main thread (web worker context)
 * 4. Console fallback (when neither is available)
 */
export class UnifiedLogNotificationHandler implements LogNotificationHandler {
  private static browserInstance: UnifiedLogNotificationHandler;
  private static workerInstance: UnifiedLogNotificationHandler;
  private connection: Connection | null = null;
  private readonly isWebWorker: boolean;

  private constructor(isWebWorker = false) {
    this.isWebWorker = isWebWorker;
  }

  /**
   * Gets the singleton instance for browser context
   */
  static getBrowserInstance(
    connection: Connection,
  ): UnifiedLogNotificationHandler {
    if (!UnifiedLogNotificationHandler.browserInstance) {
      UnifiedLogNotificationHandler.browserInstance =
        new UnifiedLogNotificationHandler(false);
    }
    UnifiedLogNotificationHandler.browserInstance.connection = connection;
    return UnifiedLogNotificationHandler.browserInstance;
  }

  /**
   * Gets the singleton instance for web worker context
   */
  static getWorkerInstance(
    connection?: Connection,
  ): UnifiedLogNotificationHandler {
    if (!UnifiedLogNotificationHandler.workerInstance) {
      UnifiedLogNotificationHandler.workerInstance =
        new UnifiedLogNotificationHandler(true);
    }
    if (connection) {
      UnifiedLogNotificationHandler.workerInstance.connection = connection;
    }
    return UnifiedLogNotificationHandler.workerInstance;
  }

  /**
   * Reset instances (for testing only)
   */
  static resetInstances(): void {
    UnifiedLogNotificationHandler.browserInstance = undefined as any;
    UnifiedLogNotificationHandler.workerInstance = undefined as any;
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

    // If in web worker context, also send via postMessage
    if (this.isWebWorker) {
      this.sendViaPostMessage(params);
    }
  }

  /**
   * Sends log message via LSP connection
   */
  private sendViaLsp(params: LogMessageParams): void {
    if (!this.connection) {
      return;
    }

    try {
      this.connection.sendNotification('window/logMessage', {
        type: this.getLogMessageType(params.type),
        message: params.message,
      });
    } catch {
      // If LSP notification fails, silently continue - no need to log errors about logging
    }
  }

  /**
   * Sends log message via postMessage (web worker context)
   */
  private sendViaPostMessage(params: LogMessageParams): void {
    if (typeof self !== 'undefined') {
      try {
        self.postMessage({
          type: 'logNotification',
          level: params.type,
          message: params.message,
          timestamp: new Date().toISOString(),
          source: 'apex-ls-unified',
        });
      } catch (error) {
        // Fallback to console if postMessage fails
        console.warn(
          `[UnifiedLogNotificationHandler] Failed to send via postMessage: ${error}`,
        );
      }
    }
  }

  /**
   * Convert internal log type to LSP message type (for browser context)
   */
  private getLogMessageType(type: string): MessageType {
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

// Export convenience functions for backward compatibility
export const BrowserLogNotificationHandler = UnifiedLogNotificationHandler;
