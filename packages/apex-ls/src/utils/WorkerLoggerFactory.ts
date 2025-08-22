/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { Logger } from 'vscode-jsonrpc';
import type { LoggerInterface } from '@salesforce/apex-lsp-shared';
import { LoggingUtils } from './LoggingUtils';

/**
 * Creates loggers for worker environments
 */
export class WorkerLoggerFactory {
  private static instance: WorkerLoggerFactory;
  private readonly loggers: Map<string, Logger> = new Map();

  private constructor() {}

  /**
   * Gets the singleton instance
   */
  static getInstance(): WorkerLoggerFactory {
    if (!WorkerLoggerFactory.instance) {
      WorkerLoggerFactory.instance = new WorkerLoggerFactory();
    }
    return WorkerLoggerFactory.instance;
  }

  /**
   * Gets a logger for the specified name
   */
  getLogger(): LoggerInterface {
    return this.createLogger('ApexLanguageServer');
  }

  /**
   * Creates a logger for worker environments
   */
  private createLogger(name: string): LoggerInterface {
    return {
      error: (message: string | (() => string)) => {
        const msg = typeof message === 'function' ? message() : message;
        console.error(LoggingUtils.formatMessage(name, msg));
      },
      warn: (message: string | (() => string)) => {
        const msg = typeof message === 'function' ? message() : message;
        console.warn(LoggingUtils.formatMessage(name, msg));
      },
      info: (message: string | (() => string)) => {
        const msg = typeof message === 'function' ? message() : message;
        console.info(LoggingUtils.formatMessage(name, msg));
      },
      log: (message: string | (() => string)) => {
        const msg = typeof message === 'function' ? message() : message;
        console.log(LoggingUtils.formatMessage(name, msg));
      },
      debug: (message: string | (() => string)) => {
        const msg = typeof message === 'function' ? message() : message;
        console.debug(LoggingUtils.formatMessage(name, msg));
      },
    };
  }
}
