/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as vscode from 'vscode';
import {
  LogNotificationHandler,
  LogMessageParams,
} from '@salesforce/apex-lsp-shared';
import {
  getWorkerServerOutputChannel,
  formatLogMessageWithTimestamp,
} from '../logging';

/**
 * VSCode-specific implementation of LogNotificationHandler
 */
export class VSCodeLogNotificationHandler implements LogNotificationHandler {
  private readonly outputChannel: vscode.OutputChannel | undefined;

  constructor() {
    // Use the shared worker/server output channel
    this.outputChannel = getWorkerServerOutputChannel();
  }

  /**
   * Send a log message to the VSCode output channel
   */
  public sendLogMessage(params: LogMessageParams): void {
    if (this.outputChannel) {
      // Remove [NODE] or [BROWSER] prefix if present, then format
      let cleanMessage = params.message;
      if (cleanMessage.startsWith('[NODE] ')) {
        cleanMessage = cleanMessage.substring(7); // Remove '[NODE] '
      } else if (cleanMessage.startsWith('[BROWSER] ')) {
        cleanMessage = cleanMessage.substring(10); // Remove '[BROWSER] '
      }

      // Format with timestamp and log level
      const formattedMessage = formatLogMessageWithTimestamp(
        cleanMessage,
        params.type,
      );
      this.outputChannel.appendLine(formattedMessage);
    }
  }

  /**
   * Get the output channel instance
   */
  public getOutputChannel(): vscode.OutputChannel | undefined {
    return this.outputChannel;
  }

  /**
   * Show the output channel
   */
  public show(): void {
    if (this.outputChannel) {
      this.outputChannel.show();
    }
  }

  /**
   * Dispose of the output channel
   */
  public dispose(): void {
    // Don't dispose the shared output channel, it's managed elsewhere
  }
}
