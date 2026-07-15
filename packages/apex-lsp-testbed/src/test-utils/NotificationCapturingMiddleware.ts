/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { ApexClientMiddleware } from '@salesforce/apex-lsp-client';
import type { Disposable } from '@salesforce/apex-lsp-shared';

import type { ApexLspTestClient } from './ApexLspTestClient';

/**
 * Represents a captured LSP notification
 */
export interface CapturedNotification {
  method: string;
  params: any;
  timestamp: number;
}

/**
 * SDK-native middleware for capturing log-related LSP notifications
 * (`window/logMessage` and `$/logMessage`) sent from server to client.
 *
 * Implements `ApexClientMiddleware` so it can be installed via `client.use(mw)`.
 * Only captures log message notifications; other notifications are forwarded
 * without recording.
 */
export class NotificationCapturingMiddleware implements ApexClientMiddleware {
  private notifications: CapturedNotification[] = [];
  private disposable: Disposable | null = null;

  /**
   * Install this middleware on an ApexLspTestClient.
   * Returns the Disposable for uninstalling.
   */
  public installOnClient(client: ApexLspTestClient): Disposable {
    this.disposable = client.use(this);
    return this.disposable;
  }

  // --- ApexClientMiddleware implementation ---

  onNotification<P>(method: string, params: P, next: (p: P) => void): void {
    // Capture window/logMessage and $/logMessage notifications
    if (method === 'window/logMessage' || method === '$/logMessage') {
      this.notifications.push({
        method,
        params,
        timestamp: Date.now(),
      });
    }
    next(params);
  }

  // --- Query methods ---

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
    if (this.disposable) {
      this.disposable.dispose();
      this.disposable = null;
    }
    this.notifications = [];
  }
}
