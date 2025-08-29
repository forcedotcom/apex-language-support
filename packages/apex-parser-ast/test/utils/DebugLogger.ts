/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { LoggerInterface, LogMessageType } from '@salesforce/apex-lsp-shared';

/**
 * Debug logger that captures log messages for analysis
 */
export class DebugLogger implements LoggerInterface {
  private capturedMessages: Array<{
    type: LogMessageType;
    message: string;
    timestamp: Date;
  }> = [];

  /**
   * Get all captured messages
   */
  public getCapturedMessages(): Array<{
    type: LogMessageType;
    message: string;
    timestamp: Date;
  }> {
    return [...this.capturedMessages];
  }

  /**
   * Get captured messages by type
   */
  public getMessagesByType(type: LogMessageType): string[] {
    return this.capturedMessages
      .filter((msg) => msg.type === type)
      .map((msg) => msg.message);
  }

  /**
   * Get captured debug messages
   */
  public getDebugMessages(): string[] {
    return this.getMessagesByType('debug');
  }

  /**
   * Get captured error messages
   */
  public getErrorMessages(): string[] {
    return this.getMessagesByType('error');
  }

  /**
   * Clear all captured messages
   */
  public clear(): void {
    this.capturedMessages = [];
  }

  /**
   * Print captured messages to console
   */
  public printCapturedMessages(): void {
    console.log('=== Captured Log Messages ===');
    this.capturedMessages.forEach((msg) => {
      const timestamp = msg.timestamp.toISOString();
      console.log(`[${timestamp}] [${msg.type.toUpperCase()}] ${msg.message}`);
    });
    console.log('=== End Captured Messages ===');
  }

  /**
   * Log a message with the specified type
   */
  public log(
    messageType: LogMessageType,
    message: string | (() => string),
  ): void {
    const msg = typeof message === 'function' ? message() : message;
    this.capturedMessages.push({
      type: messageType,
      message: msg,
      timestamp: new Date(),
    });

    // Also log to console for immediate visibility
    const timestamp = new Date().toISOString();
    const typeString = messageType.toUpperCase();
    console.log(`[${timestamp}] [${typeString}] ${msg}`);
  }

  /**
   * Log a debug message
   */
  public debug(message: string | (() => string)): void {
    this.log('debug', message);
  }

  /**
   * Log an info message
   */
  public info(message: string | (() => string)): void {
    this.log('info', message);
  }

  /**
   * Log a warning message
   */
  public warn(message: string | (() => string)): void {
    this.log('warning', message);
  }

  /**
   * Log an error message
   */
  public error(message: string | (() => string)): void {
    this.log('error', message);
  }
}

/**
 * Debug logger factory
 */
export class DebugLoggerFactory {
  private static instance: DebugLogger = new DebugLogger();

  public static getLogger(): DebugLogger {
    return DebugLoggerFactory.instance;
  }

  public static reset(): void {
    DebugLoggerFactory.instance = new DebugLogger();
  }
}
