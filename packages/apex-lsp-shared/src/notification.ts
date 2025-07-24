/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Log message type union
 */
export type LogMessageType = 'error' | 'warning' | 'info' | 'log' | 'debug';

/**
 * Log message parameters interface
 */
export interface LogMessageParams {
  /**
   * The type of the log message
   */
  type: LogMessageType;
  /**
   * The message to log
   */
  message: string;
}

/**
 * Interface for the log notification handler
 * This allows platform-specific implementations to handle log messages
 * and send them to the language client
 */
export interface LogNotificationHandler {
  /**
   * Send a log message to the language client
   * @param params The log message parameters
   */
  sendLogMessage(params: LogMessageParams): void;
}

/**
 * Default implementation of LogNotificationHandler that does nothing
 * Platform-specific implementations should override this
 */
export class DefaultLogNotificationHandler implements LogNotificationHandler {
  public sendLogMessage(_params: LogMessageParams): void {
    // Default implementation does nothing
    // Platform-specific implementations should override this
  }
}

// Singleton instance of the log notification handler
let logNotificationHandler: LogNotificationHandler =
  new DefaultLogNotificationHandler();

/**
 * Set the log notification handler
 * @param handler The log notification handler to use
 */
export const setLogNotificationHandler = (
  handler: LogNotificationHandler,
): void => {
  logNotificationHandler = handler;
};

/**
 * Get the current log notification handler
 * @returns The current log notification handler
 */
export const getLogNotificationHandler = (): LogNotificationHandler =>
  logNotificationHandler;
