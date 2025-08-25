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
import type { Connection } from 'vscode-languageserver';
import { detectEnvironment } from './Environment';

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

  /**
   * Formats message with environment context
   */
  static formatMessage(message: string, context?: string): string {
    const env = detectEnvironment().toUpperCase();
    const prefix = context ? `[${env}-${context}]` : `[${env}]`;
    return `${prefix} ${message}`;
  }

  /**
   * Gets the log message type for LSP
   */
  static getLogMessageType(messageType: string): string {
    // Map debug to log for LSP compatibility
    return messageType === 'debug' ? 'log' : messageType;
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
    const msg = typeof message === 'function' ? message() : message;

    // Check if we should log based on level
    if (!shouldLog(messageType)) {
      return;
    }

    const formattedMsg = LoggingUtils.formatMessage(msg);

    // Always log to console as fallback
    LoggingUtils.logToConsole(messageType, formattedMsg);

    // Send via connection if available (worker or server context)
    if (this.connection) {
      this.sendViaConnection(messageType, formattedMsg);
      return;
    }

    // Send via LSP notification handler (browser context)
    this.sendViaLsp(messageType, formattedMsg);
  }

  private sendViaConnection(
    messageType: LogMessageType,
    message: string,
  ): void {
    try {
      this.connection!.sendNotification('window/logMessage', {
        type: messageType,
        message,
      });
    } catch (error) {
      // Fallback to console if connection fails
      console.warn(
        'Failed to send log via connection, using console fallback:',
        error,
      );
      LoggingUtils.logToConsole(messageType, message);
    }
  }

  private sendViaLsp(messageType: LogMessageType, message: string): void {
    try {
      const handler = getLogNotificationHandler();
      if (handler && typeof handler.sendLogMessage === 'function') {
        handler.sendLogMessage({ type: messageType, message });
      }
    } catch (_error) {
      // LSP handler not available or failed - already logged to console
    }
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
export class LoggerFactory implements ILoggerFactory {
  private static instance?: LoggerFactory;

  private constructor() {}

  static getInstance(): LoggerFactory {
    if (!LoggerFactory.instance) {
      LoggerFactory.instance = new LoggerFactory();
    }
    return LoggerFactory.instance;
  }

  /**
   * Creates a logger instance appropriate for the current environment
   */
  createLogger(connection?: Connection): LoggerInterface {
    return new UniversalLogger(connection);
  }

  /**
   * Gets a logger instance (implements LoggerFactory interface)
   */
  getLogger(): LoggerInterface {
    return new UniversalLogger();
  }

  /**
   * Creates a logger with automatic connection detection
   */
  static createLogger(connection?: Connection): LoggerInterface {
    return LoggerFactory.getInstance().createLogger(connection);
  }
}

// =============================================================================
// LEGACY ADAPTER
// =============================================================================

/**
 * Adapter for legacy logger interfaces
 */
export class LoggerAdapter implements LoggerInterface {
  constructor(private readonly logger: LoggerInterface) {}

  log(messageType: LogMessageType, message: string | (() => string)): void {
    const msg = typeof message === 'function' ? message() : message;
    this.logger.log(messageType, msg);
  }

  debug(message: string | (() => string)): void {
    const msg = typeof message === 'function' ? message() : message;
    this.logger.debug(msg);
  }

  info(message: string | (() => string)): void {
    const msg = typeof message === 'function' ? message() : message;
    this.logger.info(msg);
  }

  warn(message: string | (() => string)): void {
    const msg = typeof message === 'function' ? message() : message;
    this.logger.warn(msg);
  }

  error(message: string | (() => string)): void {
    const msg = typeof message === 'function' ? message() : message;
    this.logger.error(msg);
  }
}
