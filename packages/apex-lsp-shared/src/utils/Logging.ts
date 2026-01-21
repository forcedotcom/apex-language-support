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
} from '../index';
import {
  getLogNotificationHandler,
  shouldLog,
  logMessageTypeToLspNumber,
} from '../index';
import type { Connection } from 'vscode-languageserver';

// =============================================================================
// LOGGING UTILITIES
// =============================================================================

/**
 * Unified logging utilities that work across all environments
 */
export class LoggingUtils {
  /**
   * Logs a message to console with appropriate formatting
   */
  static logToConsole(messageType: LogMessageType, message: string): void {
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] ${message}`;

    switch (messageType) {
      case 'error':
        console.error(formattedMessage);
        break;
      case 'warning':
        console.warn(formattedMessage);
        break;
      case 'info':
        console.info(formattedMessage);
        break;
      case 'debug':
        console.debug(formattedMessage);
        break;
      default:
        console.log(formattedMessage);
    }
  }

  /**
   * Gets correlation ID for message tracking
   */
  static generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// =============================================================================
// UNIFIED LOGGER IMPLEMENTATION
// =============================================================================

/**
 * Unified logger that adapts to different environments
 */
export class UniversalLogger implements LoggerInterface {
  private readonly timers = new Map<string, number>();
  private connection?: Connection;

  constructor(connection?: Connection) {
    this.connection = connection;
  }

  log(messageType: LogMessageType, message: string | (() => string)): void {
    if (!shouldLog(messageType)) {
      return;
    }
    const msg = typeof message === 'function' ? message() : message;

    // Send raw message - formatting will be handled by client-side handler
    // Send via connection if available (worker or server context)
    if (this.connection) {
      this.sendViaConnection(messageType, msg);
      return;
    }

    // Send via LSP notification handler (browser context)
    if (this.sendViaLsp(messageType, msg)) {
      return;
    }

    // No connection or handler available - silently ignore (no console fallback)
  }

  private sendViaConnection(
    messageType: LogMessageType,
    message: string,
  ): void {
    try {
      if (this.connection) {
        // Convert to numeric LSP MessageType for proper protocol compliance
        // VS Code's built-in handler will add timestamp and log level prefix
        const lspMessageType = logMessageTypeToLspNumber(messageType);
        this.connection.sendNotification('window/logMessage', {
          type: lspMessageType,
          message,
        });
      }
      // No connection - silently ignore (no console fallback)
    } catch (_error) {
      // Connection failed - silently ignore (no console fallback)
    }
  }

  private sendViaLsp(messageType: LogMessageType, message: string): boolean {
    try {
      const handler = getLogNotificationHandler();
      if (handler && typeof handler.sendLogMessage === 'function') {
        handler.sendLogMessage({ type: messageType, message });
        return true;
      }
    } catch (_error) {
      // LSP handler not available or failed
    }
    return false;
  }

  debug(message: string | (() => string)): void {
    this.log('debug', message);
  }

  info(message: string | (() => string)): void {
    this.log('info', message);
  }

  warn(message: string | (() => string)): void {
    this.log('warning', message);
  }

  error(message: string | (() => string)): void {
    this.log('error', message);
  }

  alwaysLog(message: string | (() => string)): void {
    this.log('log', message);
  }

  startTimer(name: string): void {
    this.timers.set(name, Date.now());
  }

  endTimer(name: string): void {
    const startTime = this.timers.get(name);
    if (startTime) {
      const duration = Date.now() - startTime;
      this.debug(() => `Timer ${name}: ${duration}ms`);
      this.timers.delete(name);
    }
  }
}

// =============================================================================
// LOGGER FACTORY
// =============================================================================

/**
 * Universal logger factory that works across all environments
 */
export class UniversalLoggerFactory implements ILoggerFactory {
  private static instance?: UniversalLogger;

  private constructor() {}

  static getInstance(): UniversalLoggerFactory {
    return new UniversalLoggerFactory();
  }

  /**
   * Creates a logger instance appropriate for the current environment
   * If an instance already exists, update its connection
   */
  createLogger(connection?: Connection): LoggerInterface {
    if (!UniversalLoggerFactory.instance) {
      UniversalLoggerFactory.instance = new UniversalLogger(connection);
    } else if (connection) {
      // Update connection on existing instance
      (UniversalLoggerFactory.instance as any).connection = connection;
    }
    return UniversalLoggerFactory.instance;
  }

  /**
   * Gets a logger instance (implements LoggerFactory interface)
   * IMPORTANT: createLogger(connection) must be called first to initialize the logger
   */
  getLogger(): LoggerInterface {
    if (!UniversalLoggerFactory.instance) {
      // Logger not initialized yet - create a logger without connection
      // Messages will be silently ignored until connection is set
      return new UniversalLogger();
    }
    return UniversalLoggerFactory.instance;
  }

  /**
   * Creates a logger with automatic connection detection
   */
  static createLogger(connection?: Connection): LoggerInterface {
    return UniversalLoggerFactory.getInstance().createLogger(connection);
  }
}
