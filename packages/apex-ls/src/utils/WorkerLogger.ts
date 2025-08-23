/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { Connection } from 'vscode-languageserver/browser';
import { MessageType } from 'vscode-languageserver/browser';

/**
 * Log categories for worker operations
 */
export enum LogCategory {
  STARTUP = 'STARTUP',
  LSP = 'LSP',
  SYMBOLS = 'SYMBOLS',
  COMPLETION = 'COMPLETION',
  DIAGNOSTICS = 'DIAGNOSTICS',
  PERFORMANCE = 'PERFORMANCE',
}

/**
 * Interface for the worker logger
 */
export interface WorkerLogger {
  error(message: string, category?: LogCategory): void;
  warn(message: string, category?: LogCategory): void;
  info(message: string, category?: LogCategory): void;
  debug(message: string, category?: LogCategory): void;
  time(label: string): void;
  timeEnd(label: string): void;
}

/**
 * Logger configuration interface
 */
export interface LoggerConfig {
  logLevel: 'error' | 'warning' | 'info' | 'debug';
  enablePerformanceLogs: boolean;
  logCategories: LogCategory[];
}

/**
 * Implementation of the worker logger
 */
export class WorkerLoggerImpl implements WorkerLogger {
  private readonly connection: Connection;
  private readonly timers: Map<string, number>;
  private config: LoggerConfig;

  constructor(connection: Connection) {
    this.connection = connection;
    this.timers = new Map();
    this.config = {
      logLevel: 'info',
      enablePerformanceLogs: false,
      logCategories: [
        LogCategory.STARTUP,
        LogCategory.LSP,
        LogCategory.SYMBOLS,
        LogCategory.COMPLETION,
        LogCategory.DIAGNOSTICS,
      ],
    };
  }

  /**
   * Update logger configuration
   */
  public updateConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Check if a log level is enabled
   */
  private isLevelEnabled(
    level: 'error' | 'warning' | 'info' | 'debug',
  ): boolean {
    const levels = ['error', 'warning', 'info', 'debug'];
    const configIndex = levels.indexOf(this.config.logLevel);
    const levelIndex = levels.indexOf(level);
    return levelIndex <= configIndex;
  }

  /**
   * Check if a category is enabled
   */
  private isCategoryEnabled(category?: LogCategory): boolean {
    if (!category) return true;
    return this.config.logCategories.includes(category);
  }

  /**
   * Format a log message with category
   */
  private formatMessage(
    message: string,
    category?: LogCategory,
    correlationId?: string,
  ): string {
    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: true });
    const categoryStr = category ? ` [${category}]` : '';
    const correlationStr = correlationId ? ` [CID:${correlationId}]` : '';
    return `[${timestamp}] [APEX-WORKER]${categoryStr}${correlationStr} ${message}`;
  }

  /**
   * Send a log message to the client
   */
  private log(
    type: MessageType,
    message: string,
    category?: LogCategory,
    correlationId?: string,
  ): void {
    // Check if the log level and category are enabled
    const level =
      type === MessageType.Error
        ? 'error'
        : type === MessageType.Warning
          ? 'warning'
          : type === MessageType.Info
            ? 'info'
            : 'debug';

    if (!this.isLevelEnabled(level) || !this.isCategoryEnabled(category)) {
      return;
    }

    this.connection.sendNotification('window/logMessage', {
      type,
      message: this.formatMessage(message, category, correlationId),
    });
  }

  /**
   * Log an error message
   */
  public error(
    message: string,
    category?: LogCategory,
    correlationId?: string,
  ): void {
    this.log(MessageType.Error, message, category, correlationId);
  }

  /**
   * Log a warning message
   */
  public warn(
    message: string,
    category?: LogCategory,
    correlationId?: string,
  ): void {
    this.log(MessageType.Warning, message, category, correlationId);
  }

  /**
   * Log an info message
   */
  public info(
    message: string,
    category?: LogCategory,
    correlationId?: string,
  ): void {
    this.log(MessageType.Info, message, category, correlationId);
  }

  /**
   * Log a debug message
   */
  public debug(
    message: string,
    category?: LogCategory,
    correlationId?: string,
  ): void {
    this.log(MessageType.Log, message, category, correlationId);
  }

  /**
   * Start a performance timer
   */
  public time(label: string): void {
    if (!this.config.enablePerformanceLogs) return;
    this.timers.set(label, performance.now());
  }

  /**
   * End a performance timer and log the duration
   */
  public timeEnd(label: string): void {
    if (!this.config.enablePerformanceLogs) return;
    const start = this.timers.get(label);
    if (start === undefined) {
      this.warn(`Timer '${label}' does not exist`, LogCategory.PERFORMANCE);
      return;
    }

    const duration = performance.now() - start;
    this.info(`${label}: ${duration.toFixed(2)}ms`, LogCategory.PERFORMANCE);
    this.timers.delete(label);
  }
}
