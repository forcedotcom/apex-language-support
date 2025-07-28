/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Test logger implementation that captures log lines to an array
 * for debugging and testing purposes
 */
export class TestLogger {
  private logs: Array<{
    level: 'debug' | 'info' | 'warn' | 'error';
    message: string;
    timestamp: number;
  }> = [];

  /**
   * Get all captured logs
   */
  getLogs(): Array<{ level: string; message: string; timestamp: number }> {
    return [...this.logs];
  }

  /**
   * Get logs filtered by level
   */
  getLogsByLevel(level: 'debug' | 'info' | 'warn' | 'error'): string[] {
    return this.logs
      .filter((log) => log.level === level)
      .map((log) => log.message);
  }

  /**
   * Get all debug logs
   */
  getDebugLogs(): string[] {
    return this.getLogsByLevel('debug');
  }

  /**
   * Get all info logs
   */
  getInfoLogs(): string[] {
    return this.getLogsByLevel('info');
  }

  /**
   * Get all warning logs
   */
  getWarnLogs(): string[] {
    return this.getLogsByLevel('warn');
  }

  /**
   * Get all error logs
   */
  getErrorLogs(): string[] {
    return this.getLogsByLevel('error');
  }

  /**
   * Search logs for a specific message pattern
   */
  searchLogs(pattern: string | RegExp): string[] {
    const regex =
      typeof pattern === 'string' ? new RegExp(pattern, 'i') : pattern;
    return this.logs
      .filter((log) => regex.test(log.message))
      .map((log) => log.message);
  }

  /**
   * Clear all captured logs
   */
  clear(): void {
    this.logs = [];
  }

  /**
   * Get the number of captured logs
   */
  getLogCount(): number {
    return this.logs.length;
  }

  /**
   * Debug logging
   */
  debug(message: string | (() => string)): void {
    const msg = typeof message === 'function' ? message() : message;
    this.logs.push({
      level: 'debug',
      message: msg,
      timestamp: Date.now(),
    });
  }

  /**
   * Info logging
   */
  info(message: string | (() => string)): void {
    const msg = typeof message === 'function' ? message() : message;
    this.logs.push({
      level: 'info',
      message: msg,
      timestamp: Date.now(),
    });
  }

  /**
   * Warning logging
   */
  warn(message: string | (() => string)): void {
    const msg = typeof message === 'function' ? message() : message;
    this.logs.push({
      level: 'warn',
      message: msg,
      timestamp: Date.now(),
    });
  }

  /**
   * Error logging
   */
  error(message: string | (() => string)): void {
    const msg = typeof message === 'function' ? message() : message;
    this.logs.push({
      level: 'error',
      message: msg,
      timestamp: Date.now(),
    });
  }

  /**
   * Print all logs to console (for debugging)
   */
  printLogs(): void {
    console.log('=== Test Logger Output ===');
    this.logs.forEach((log) => {
      console.log(`[${log.level.toUpperCase()}] ${log.message}`);
    });
    console.log('=== End Test Logger Output ===');
  }

  /**
   * Get logs as formatted string
   */
  toString(): string {
    return this.logs
      .map((log) => `[${log.level.toUpperCase()}] ${log.message}`)
      .join('\n');
  }
}

/**
 * Factory function to create a test logger
 */
export function createTestLogger(): TestLogger {
  return new TestLogger();
}

/**
 * Mock logger factory that returns a test logger
 * This can be used to replace the real logger in tests
 */
export function getTestLogger(): TestLogger {
  return new TestLogger();
}
