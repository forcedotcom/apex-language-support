/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { MessageConnection } from 'vscode-jsonrpc';
import type { EnvironmentType } from '@salesforce/apex-lsp-shared';
import type { ConnectionConfig } from '@salesforce/apex-lsp-shared';
import { BaseConnectionFactory } from '@salesforce/apex-lsp-shared';
import { WorkerMessageBridge } from '../communication/PlatformBridges';

/**
 * Web Worker-specific connection factory
 */
export class WorkerConnectionFactory extends BaseConnectionFactory {
  supports(environment: EnvironmentType): boolean {
    return environment === 'webworker';
  }

  async createConnection(
    config?: ConnectionConfig,
  ): Promise<MessageConnection> {
    this.validateConfig(config);

    try {
      return WorkerMessageBridge.forWorkerServer(config?.logger);
    } catch (error) {
      this.handleError(error as Error, 'WorkerConnectionFactory');
    }
  }

  /**
   * Web Worker specific configuration validation
   */
  protected validateConfig(config?: ConnectionConfig): void {
    super.validateConfig(config);

    // Worker connections don't use socket-specific options
    if (config?.mode && config.mode !== 'stdio') {
      throw new Error(
        `Worker connections only support stdio mode, got: ${config.mode}`,
      );
    }
  }
}
