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
  LogMessageType,
} from '@salesforce/apex-lsp-shared';
import { getWorkerServerOutputChannel } from '../logging';

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
   * Format a log message with timestamp and SERVER prefix
   */
  private formatMessage(type: LogMessageType, message: string): string {
    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: true });
    const typeString = type.toUpperCase();
    return `[${timestamp}] [${typeString}] [SERVER] ${message}`;
  }

  /**
   * Send a log message to the VSCode output channel
   */
  public sendLogMessage(params: LogMessageParams): void {
    if (this.outputChannel) {
      const formattedMessage = this.formatMessage(params.type, params.message);
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
