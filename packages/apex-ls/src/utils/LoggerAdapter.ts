/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { Logger } from 'vscode-jsonrpc';
import type { LoggerInterface } from '@salesforce/apex-lsp-shared';

/**
 * Adapts our LoggerInterface to vscode-jsonrpc's Logger interface
 */
export class LoggerAdapter implements Logger {
  constructor(private logger: LoggerInterface) {}

  error(message: string): void {
    this.logger.error(message);
  }

  warn(message: string): void {
    this.logger.warn(message);
  }

  info(message: string): void {
    this.logger.info(message);
  }

  log(message: string): void {
    this.logger.log('log', message);
  }
}

/**
 * Creates a vscode-jsonrpc Logger from our LoggerInterface
 */
export function createLoggerAdapter(logger: LoggerInterface): Logger {
  return new LoggerAdapter(logger);
}
