/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Connection, MessageType } from 'vscode-languageserver/node';
import {
  LogMessageParams,
  LogMessageType,
  LogNotificationHandler,
} from '@salesforce/apex-lsp-logging';

/**
 * Node-specific implementation of LogNotificationHandler
 * Sends log messages to both the console and the language client
 */
export class NodeLogNotificationHandler implements LogNotificationHandler {
  private static instance: NodeLogNotificationHandler | undefined;
  private connection: Connection;

  private constructor(connection: Connection) {
    this.connection = connection;
  }

  /**
   * Get the singleton instance of the NodeLogNotificationHandler
   * @param connection The LSP connection to use for sending notifications
   * @returns The NodeLogNotificationHandler instance
   */
  public static getInstance(
    connection: Connection,
  ): NodeLogNotificationHandler {
    if (!NodeLogNotificationHandler.instance) {
      NodeLogNotificationHandler.instance = new NodeLogNotificationHandler(
        connection,
      );
    }
    return NodeLogNotificationHandler.instance;
  }

  /**
   * Send a log message to the language client
   * @param params The log message parameters
   */
  public sendLogMessage(params: LogMessageParams): void {
    // Send to language client
    this.connection.sendNotification('window/logMessage', {
      type: this.getLogMessageType(params.type),
      message: params.message,
    });

    // Send to console
    switch (params.type) {
      case LogMessageType.Error:
        console.error(params.message);
        break;
      case LogMessageType.Warning:
        console.warn(params.message);
        break;
      case LogMessageType.Info:
        console.info(params.message);
        break;
      case LogMessageType.Log:
      case LogMessageType.Debug:
      default:
        console.log(params.message);
        break;
    }
  }

  /**
   * Convert internal log type to LSP message type
   * @param type The internal log type
   * @returns The corresponding LSP message type
   */
  private getLogMessageType(type: LogMessageType): MessageType {
    switch (type) {
      case LogMessageType.Error:
        return MessageType.Error;
      case LogMessageType.Warning:
        return MessageType.Warning;
      case LogMessageType.Info:
        return MessageType.Info;
      case LogMessageType.Log:
        return MessageType.Log;
      case LogMessageType.Debug:
        // Map Debug to Log for backward compatibility with older LSP clients
        return MessageType.Log;
      default:
        return MessageType.Log;
    }
  }

  /**
   * Reset the singleton instance (for testing only)
   */
  public static resetInstance(): void {
    NodeLogNotificationHandler.instance = undefined;
  }
}
