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
  LoggerFactory,
} from '@salesforce/apex-lsp-shared';
import {
  getLogNotificationHandler,
  shouldLog,
} from '@salesforce/apex-lsp-shared';

/**
 * Unified logger implementation that works in both browser and web worker contexts
 *
 * This logger can send log messages through multiple channels:
 * 1. LSP connection via LogNotificationHandler (when available)
 * 2. postMessage to main thread (when in web worker context)
 * 3. Console fallback (when neither is available)
 */
class UnifiedLogger implements LoggerInterface {
  private readonly usePostMessage: boolean;

  constructor(usePostMessage = false) {
    this.usePostMessage = usePostMessage;
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
    this.sendViaConsole(messageType, msg);

    // Try LSP notification handler first (browser context)
    this.sendViaLsp(messageType, msg);

    // If in web worker context, also send via postMessage
    if (this.usePostMessage) {
      this.sendViaPostMessage(messageType, msg);
    }
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

  /**
   * Sends a log message via console (fallback)
   */
  private sendViaConsole(messageType: LogMessageType, message: string): void {
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

  /**
   * Sends a log message via postMessage (web worker context)
   * Note: Direct postMessage is blocked in VS Code web worker environment,
   * so we'll skip this and rely on LSP connection only
   */
  private sendViaPostMessage(
    messageType: LogMessageType,
    message: string,
  ): void {
    // Skip direct postMessage in VS Code web worker environment
    // All logging will go through the LSP connection instead
    return;
  }
}

/**
 * Unified factory for creating loggers that work in both browser and web worker contexts
 */
export class UnifiedLoggerFactory implements LoggerFactory {
  private static browserInstance: UnifiedLoggerFactory;
  private static workerInstance: UnifiedLoggerFactory;
  private readonly usePostMessage: boolean;

  private constructor(usePostMessage = false) {
    this.usePostMessage = usePostMessage;
  }

  /**
   * Gets the singleton instance for browser context
   */
  static getBrowserInstance(): UnifiedLoggerFactory {
    if (!UnifiedLoggerFactory.browserInstance) {
      UnifiedLoggerFactory.browserInstance = new UnifiedLoggerFactory(false);
    }
    return UnifiedLoggerFactory.browserInstance;
  }

  /**
   * Gets the singleton instance for web worker context
   */
  static getWorkerInstance(): UnifiedLoggerFactory {
    if (!UnifiedLoggerFactory.workerInstance) {
      UnifiedLoggerFactory.workerInstance = new UnifiedLoggerFactory(true);
    }
    return UnifiedLoggerFactory.workerInstance;
  }

  /**
   * Gets a logger instance (implements LoggerFactory interface)
   */
  getLogger(): LoggerInterface {
    return new UnifiedLogger(this.usePostMessage);
  }
}

// Export convenience functions for backward compatibility
export const BrowserLoggerFactory = UnifiedLoggerFactory;
