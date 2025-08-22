/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { Connection } from 'vscode-languageserver/browser';
import {
  LoggerFactory,
  LoggerInterface,
  LogMessageType,
} from '@salesforce/apex-lsp-shared';

/**
 * Worker-specific logger implementation
 */
class WorkerLogger implements LoggerInterface {
  private readonly timers: Map<string, number>;

  constructor(private readonly connection: Connection) {
    this.timers = new Map();
  }

  public log(
    messageType: LogMessageType,
    message: string | (() => string),
  ): void {
    const msg = typeof message === 'function' ? message() : message;
    this.connection.sendNotification('window/logMessage', {
      type: messageType,
      message: `[APEX-WORKER] ${msg}`,
    });
  }

  public debug(message: string | (() => string)): void {
    this.log('debug', message);
  }

  public info(message: string | (() => string)): void {
    this.log('info', message);
  }

  public warn(message: string | (() => string)): void {
    this.log('warning', message);
  }

  public error(message: string | (() => string)): void {
    this.log('error', message);
  }

  public time(label: string): void {
    this.timers.set(label, performance.now());
  }

  public timeEnd(label: string): void {
    const start = this.timers.get(label);
    if (start === undefined) {
      this.warn(`Timer '${label}' does not exist`);
      return;
    }

    const duration = performance.now() - start;
    this.info(`${label}: ${duration.toFixed(2)}ms`);
    this.timers.delete(label);
  }
}

/**
 * Worker-specific logger factory
 */
export class WorkerLoggerFactory implements LoggerFactory {
  private readonly logger: LoggerInterface;

  constructor(connection: Connection) {
    this.logger = new WorkerLogger(connection);
  }

  public getLogger(): LoggerInterface {
    return this.logger;
  }
}
