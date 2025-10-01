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
import { getLogNotificationHandler, shouldLog } from '../index';
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
   * Gets the log message type for LSP (numeric values per LSP protocol)
   * LSP MessageType: Error = 1, Warning = 2, Info = 3, Log = 4
   */
  static getLogMessageType(messageType: LogMessageType): number {
    switch (messageType) {
      case 'error':
        return 1; // MessageType.Error
      case 'warning':
        return 2; // MessageType.Warning
      case 'info':
        return 3; // MessageType.Info
      case 'debug':
        return 4; // MessageType.Log (debug maps to log in LSP)
      default:
        return 3; // Default to Info
    }
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

    // Send via connection if available (worker or server context)
    if (this.connection) {
      this.sendViaConnection(messageType, formattedMsg);
      return;
    }

    // Send via LSP notification handler (browser context)
    if (this.sendViaLsp(messageType, formattedMsg)) {
      return;
    }

    // Fallback to console only if no other method worked
    LoggingUtils.logToConsole(messageType, formattedMsg);
  }

  private sendViaConnection(
    messageType: LogMessageType,
    message: string,
  ): void {
    try {
      this.connection!.sendNotification('window/logMessage', {
        type: LoggingUtils.getLogMessageType(messageType),
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
  private static instance?: UniversalLoggerFactory;
  private connection?: Connection;
  private loggerCache = new Map<Connection, LoggerInterface>();

  private constructor() {}

  static getInstance(): UniversalLoggerFactory {
    if (!UniversalLoggerFactory.instance) {
      UniversalLoggerFactory.instance = new UniversalLoggerFactory();
    }
    return UniversalLoggerFactory.instance;
  }

  /**
   * Set the connection for all loggers created by this factory
   */
  setConnection(connection: Connection): void {
    this.connection = connection;
  }

  /**
   * Creates a logger instance appropriate for the current environment
   * Uses caching to ensure the same logger instance is returned for the same connection
   */
  createLogger(connection?: Connection): LoggerInterface {
    // Use provided connection or fall back to factory's connection
    const loggerConnection = connection || this.connection;

    // Return cached logger if available for this connection
    if (loggerConnection && this.loggerCache.has(loggerConnection)) {
      return this.loggerCache.get(loggerConnection)!;
    }

    // Create new logger and cache it
    const logger = new UniversalLogger(loggerConnection);
    if (loggerConnection) {
      this.loggerCache.set(loggerConnection, logger);
    }

    return logger;
  }

  /**
   * Gets a logger instance (implements LoggerFactory interface)
   */
  getLogger(): LoggerInterface {
    // Use the factory's connection for loggers created via getLogger()
    return this.createLogger(this.connection);
  }

  /**
   * Creates a logger with automatic connection detection
   */
  static createLogger(connection?: Connection): LoggerInterface {
    return UniversalLoggerFactory.getInstance().createLogger(connection);
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
