/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { LogMessageParams } from '@salesforce/apex-lsp-shared';
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
   * Sends a log message to the client
   */
  sendLogMessage(params: LogMessageParams): void {
    // Send raw message - formatting will be handled by client-side handler
    if (this.connection) {
      this.connection.sendNotification('$/logMessage', {
        type: params.type,
        message: params.message,
      });
    }
    switch (params.type) {
      case 'error':
        console.error(params.message);
        break;
      case 'warning':
        console.warn(params.message);
        break;
      case 'info':
        console.info(params.message);
        break;
      default:
        console.log(params.message);
    }
  }
}
