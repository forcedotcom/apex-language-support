/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { MessageType } from 'vscode-languageserver/browser';
import type { LogMessageType } from '@salesforce/apex-lsp-shared';

/**
 * Shared utilities for logging operations across the unified language server
 */
export class LoggingUtils {
  /**
   * Convert internal log type to LSP message type
   * @param type The internal log type
   * @returns The corresponding LSP message type
   */
  static getLogMessageType(type: LogMessageType): MessageType {
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

  /**
   * Send formatted log message to console with consistent formatting
   * @param messageType The log message type
   * @param message The message to log
   */
  static logToConsole(messageType: LogMessageType, message: string): void {
    const timestamp = new Date().toISOString();
    const formatted = `[${timestamp}] [${messageType.toUpperCase()}] ${message}`;

    switch (messageType) {
      case 'error':
        console.error(formatted);
        break;
      case 'warning':
        console.warn(formatted);
        break;
      case 'info':
        console.info(formatted);
        break;
      case 'log':
        console.log(formatted);
        break;
      case 'debug':
        console.debug(formatted);
        break;
      default:
        console.log(formatted);
        break;
    }
  }
}