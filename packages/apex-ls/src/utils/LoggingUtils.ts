/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Utility functions for logging
 */
export class LoggingUtils {
  /**
   * Formats a log message with a prefix
   */
  static formatMessage(prefix: string, message: string): string {
    return `[${prefix}] ${message}`;
  }

  /**
   * Logs a message to console with appropriate level
   */
  static logToConsole(messageType: string, message: string): void {
    switch (messageType) {
      case 'error':
        console.error(message);
        break;
      case 'warning':
        console.warn(message);
        break;
      case 'info':
        console.info(message);
        break;
      case 'debug':
        console.debug(message);
        break;
      default:
        console.log(message);
        break;
    }
  }

  /**
   * Gets the log message type for LSP
   */
  static getLogMessageType(messageType: string): string {
    // Map debug to log for LSP compatibility
    return messageType === 'debug' ? 'log' : messageType;
  }
}
