/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { Connection } from 'vscode-languageserver/browser';
import type {
  LogNotificationHandler,
  LogMessageParams,
} from '@salesforce/apex-lsp-shared';
import { shouldLog } from '@salesforce/apex-lsp-shared';
import { LoggingUtils } from './LoggingUtils';

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

  private constructor() {
    // Unified constructor since postMessage functionality is not used
  }

  /**
   * Gets the singleton instance for browser context
   */
  static getBrowserInstance(
    connection: Connection,
  ): UnifiedLogNotificationHandler {
    if (!UnifiedLogNotificationHandler.browserInstance) {
      UnifiedLogNotificationHandler.browserInstance =
        new UnifiedLogNotificationHandler();
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
        new UnifiedLogNotificationHandler();
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
      this.connection.sendNotification('window/logMessage', {
        type: LoggingUtils.getLogMessageType(params.type),
        message: params.message,
      });
    } catch {
      // If LSP notification fails, silently continue - no need to log errors about logging
    }
  }


}

// Export convenience functions for backward compatibility
export const BrowserLogNotificationHandler = UnifiedLogNotificationHandler;
