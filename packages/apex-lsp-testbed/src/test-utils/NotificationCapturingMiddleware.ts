/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { ApexJsonRpcClient } from '../client/ApexJsonRpcClient';

/**
 * Represents a captured LSP notification
 */
export interface CapturedNotification {
  method: string;
  params: any;
  timestamp: number;
}

/**
 * Middleware for capturing LSP notifications sent from server to client.
 * Useful for integration testing to verify protocol messages over the wire.
 */
export class NotificationCapturingMiddleware {
  private notifications: CapturedNotification[] = [];
  private disposables: any[] = [];

  /**
   * Install this middleware on an ApexJsonRpcClient to capture notifications
   * @param client The client to install on
   */
  public installOnClient(client: ApexJsonRpcClient): void {
    // Register a listener for window/logMessage notifications
    const disposable = client.onNotification(
      'window/logMessage',
      (params: any) => {
        this.notifications.push({
          method: 'window/logMessage',
          params,
          timestamp: Date.now(),
        });
      },
    );

    this.disposables.push(disposable);

    // Also capture $/logMessage if needed
    const disposable2 = client.onNotification('$/logMessage', (params: any) => {
      this.notifications.push({
        method: '$/logMessage',
        params,
        timestamp: Date.now(),
      });
    });

    this.disposables.push(disposable2);
  }

  /**
   * Get all captured notifications
   */
  public getCapturedNotifications(): CapturedNotification[] {
    return [...this.notifications];
  }

  /**
   * Get notifications filtered by method name
   * @param method The notification method to filter by (e.g., 'window/logMessage')
   */
  public getNotificationsByMethod(method: string): CapturedNotification[] {
    return this.notifications.filter((n) => n.method === method);
  }

  /**
   * Get all window/logMessage notifications
   */
  public getLogMessages(): CapturedNotification[] {
    return this.getNotificationsByMethod('window/logMessage');
  }

  /**
   * Verify that all log messages have numeric type field
   * @throws Error if any log message has non-numeric type
   */
  public verifyAllLogTypesAreNumeric(): void {
    const logs = this.getLogMessages();
    for (const log of logs) {
      if (typeof log.params.type !== 'number') {
        throw new Error(
          `Expected numeric type but got ${typeof log.params.type}: ${log.params.type}\n` +
            `Message: ${log.params.message}`,
        );
      }
    }
  }

  /**
   * Verify that debug-level log messages have type 4 (LSP MessageType.Log)
   * @throws Error if any debug log has incorrect type
   */
  public verifyDebugLogsHaveType4(): void {
    const logs = this.getLogMessages();
    const debugLogs = logs.filter(
      (l) =>
        l.params.message?.includes('[WORKSPACE-LOAD]') ||
        l.params.message?.includes('[DEBUG]') ||
        l.params.message?.toLowerCase().includes('batch processing'),
    );

    for (const log of debugLogs) {
      if (log.params.type !== 4) {
        throw new Error(
          `Expected debug log to have type 4, but got ${log.params.type}\n` +
            `Message: ${log.params.message}`,
        );
      }
    }

    if (debugLogs.length === 0) {
      throw new Error('No debug logs were captured to verify');
    }
  }

  /**
   * Clear all captured notifications
   */
  public clear(): void {
    this.notifications.length = 0;
  }

  /**
   * Get count of captured notifications
   */
  public getCount(): number {
    return this.notifications.length;
  }

  /**
   * Get count of log messages
   */
  public getLogMessageCount(): number {
    return this.getLogMessages().length;
  }

  /**
   * Dispose of all registered notification listeners
   */
  public dispose(): void {
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
    this.disposables = [];
    this.notifications = [];
  }
}
