/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { LogMessageParams } from '@salesforce/apex-lsp-shared';
import { logMessageTypeToLspNumber } from '@salesforce/apex-lsp-shared';
import type { Connection } from 'vscode-languageserver/browser';

/**
 * Handles log notifications in worker environments
 */
export class WorkerLogNotificationHandler {
  private static instance: WorkerLogNotificationHandler;
  private readonly name: string;
  private readonly connection: Connection;

  constructor(name: string, connection: Connection) {
    this.name = name;
    this.connection = connection;
  }

  /**
   * Gets the singleton instance
   */
  static getWorkerInstance(
    connection: Connection,
  ): WorkerLogNotificationHandler {
    if (!WorkerLogNotificationHandler.instance) {
      WorkerLogNotificationHandler.instance = new WorkerLogNotificationHandler(
        'ApexLanguageServer',
        connection,
      );
    }
    return WorkerLogNotificationHandler.instance;
  }

  /**
   * Sends a log message to the client using standard LSP window/logMessage
   */
  sendLogMessage(params: LogMessageParams): void {
    // Convert to numeric LSP MessageType
    // VS Code's built-in handler will add timestamp and log level prefix
    const lspMessageType = logMessageTypeToLspNumber(params.type);

    // Send raw message - VS Code will format it
    if (this.connection) {
      this.connection.sendNotification('window/logMessage', {
        type: lspMessageType,
        message: params.message,
      });
    }
    // No console fallback - rely solely on LSP window/logMessage
  }
}
