/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { MessageConnection, Logger } from 'vscode-jsonrpc';
import {
  BaseMessageBridge,
  createTransportMessageReader,
  createTransportMessageWriter,
} from './CoreBridge';
import { WorkerMessageTransport } from './MessageTransports';
import type { MessageTransport } from '@salesforce/apex-lsp-shared';
import type { BrowserConfig, Worker } from './Interfaces';
import { isBrowserMainThread } from '../utils/EnvironmentUtils';

/**
 * Browser-side bridge for communicating with workers
 */
export class BrowserMessageBridge extends BaseMessageBridge {
  private transport: MessageTransport;
  private logger?: Logger;

  constructor(transport: MessageTransport, logger?: Logger) {
    super();
    this.transport = transport;
    this.logger = logger;
  }

  protected isEnvironmentSupported(): boolean {
    return BrowserMessageBridge.isBrowserEnvironment();
  }

  static isBrowserEnvironment(): boolean {
    return isBrowserMainThread();
  }

  createConnection(): MessageConnection {
    const reader = createTransportMessageReader(this.transport, this.logger);
    const writer = createTransportMessageWriter(this.transport, this.logger);
    return super.createConnection(reader, writer, 'Browser', this.logger);
  }

  /**
   * Creates a browser-to-worker message bridge for client-side communication
   */
  static forWorkerClient(worker: Worker, logger?: Logger): MessageConnection {
    const transport = new WorkerMessageTransport(worker);
    const bridge = new BrowserMessageBridge(transport, logger);
    return bridge.createConnection();
  }

  /**
   * Creates a message connection from browser config (platform bridge method)
   */
  static createConnection(config: BrowserConfig): MessageConnection {
    if (!config.worker) {
      throw new Error('Worker required for browser environment');
    }
    return BrowserMessageBridge.forWorkerClient(config.worker, config.logger);
  }
}
