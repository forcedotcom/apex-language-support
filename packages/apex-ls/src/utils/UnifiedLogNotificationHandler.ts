/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { MessageType, Connection } from '../protocol/lsp-types';
import {
  LogMessageParams,
  type LogMessageType,
  LogNotificationHandler,
  shouldLog,
} from '@salesforce/apex-lsp-shared';

/**
 * Unified implementation of LogNotificationHandler that works in Node.js, WebContainer, and browser environments
 * Sends log messages to both the console and the language client
 */
export class UnifiedLogNotificationHandler implements LogNotificationHandler {
  private static instance: UnifiedLogNotificationHandler | undefined;
  private connection: Connection;
  private environment: 'node' | 'webcontainer' | 'browser';

  private constructor(
    connection: Connection,
    environment: 'node' | 'webcontainer' | 'browser',
  ) {
    this.connection = connection;
    this.environment = environment;
  }

  /**
   * Get the singleton instance of the UnifiedLogNotificationHandler
   * @param connection The LSP connection to use for sending notifications
   * @param environment The runtime environment
   * @returns The UnifiedLogNotificationHandler instance
   */
  public static getInstance(
    connection: Connection,
    environment: 'node' | 'webcontainer' | 'browser',
  ): UnifiedLogNotificationHandler {
    if (!UnifiedLogNotificationHandler.instance) {
      UnifiedLogNotificationHandler.instance =
        new UnifiedLogNotificationHandler(connection, environment);
    }
    return UnifiedLogNotificationHandler.instance;
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
        // Map debug to log for backward compatibility with older LSP clients
        return MessageType.Log;
      default:
        return MessageType.Log;
    }
  }

  /**
   * Reset the singleton instance (for testing only)
   */
  public static resetInstance(): void {
    UnifiedLogNotificationHandler.instance = undefined;
  }
}
