/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type {
  LoggerInterface,
  LogMessageType,
  LoggerFactory as ILoggerFactory,
} from '@salesforce/apex-lsp-shared';
import {
  getLogNotificationHandler,
  shouldLog,
} from '@salesforce/apex-lsp-shared';
import { LoggingUtils } from './LoggingUtils';

/**
 * logger implementation that works in both browser and web worker contexts
 *
 * This logger can send log messages through multiple channels:
 * 1. LSP connection via LogNotificationHandler (when available)
 * 2. postMessage to main thread (when in web worker context)
 * 3. Console fallback (when neither is available)
 */
class Logger implements LoggerInterface {
  constructor() {
    // constructor since postMessage functionality is not used
  }

  /**
   * Logs a message with the specified type
   */
  log(messageType: LogMessageType, message: string | (() => string)): void {
    const msg = typeof message === 'function' ? message() : message;

    // Check if we should log based on level
    if (!this.shouldLog(messageType)) {
      return;
    }

    // Always log to console as fallback
    LoggingUtils.logToConsole(messageType, msg);

    // Try LSP notification handler first (browser context)
    this.sendViaLsp(messageType, msg);

    // Note: postMessage functionality removed as it's blocked in VS Code web worker environment
  }

  /**
   * Logs an error message
   */
  error(message: string | (() => string)): void {
    this.log('error', message);
  }

  /**
   * Logs a warning message
   */
  warn(message: string | (() => string)): void {
    this.log('warning', message);
  }

  /**
   * Logs an info message
   */
  info(message: string | (() => string)): void {
    this.log('info', message);
  }

  /**
   * Logs a debug message
   */
  debug(message: string | (() => string)): void {
    this.log('debug', message);
  }

  /**
   * Determines if a message at the given level should be logged
   */
  private shouldLog(messageType: LogMessageType): boolean {
    // Use the shared logging infrastructure's level checking
    return shouldLog ? shouldLog(messageType) : true;
  }

  /**
   * Sends a log message via LSP notification handler
   */
  private sendViaLsp(messageType: LogMessageType, message: string): void {
    try {
      const handler = getLogNotificationHandler();
      if (handler && typeof handler.sendLogMessage === 'function') {
        // For backward compatibility, map Debug to Log for older LSP clients
        const mappedType = messageType === 'debug' ? 'log' : messageType;
        handler.sendLogMessage({
          type: mappedType,
          message,
        });
      }
    } catch {
      // Silently fail if LSP logging is not available
    }
  }
}

/**
 * Factory for creating loggers that work in both browser and web worker contexts
 */
export class LoggerFactory implements ILoggerFactory {
  private static instance: LoggerFactory;

  private constructor() {
    // constructor since postMessage functionality is not used
  }

  /**
   * Gets the singleton instance
   */
  static getInstance(): LoggerFactory {
    if (!LoggerFactory.instance) {
      LoggerFactory.instance = new LoggerFactory();
    }
    return LoggerFactory.instance;
  }

  /**
   * Gets a logger instance (implements LoggerFactory interface)
   */
  getLogger(): LoggerInterface {
    return new Logger();
  }
}

// Export convenience functions for backward compatibility
export const BrowserLoggerFactory = LoggerFactory;

// Legacy exports for backward compatibility
export const getBrowserLoggerFactory = () => LoggerFactory.getInstance();
export const getWorkerLoggerFactory = () => LoggerFactory.getInstance();
