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
import {
  WorkerMessageTransport,
  SelfMessageTransport,
} from './MessageTransport';
import type { MessageTransport } from '@salesforce/apex-lsp-shared';
import type { BrowserConfig, WorkerConfig, Worker } from './Interfaces';
import {
  isWindowAvailable,
  isWorkerAPIAvailable,
  isWorkerThread,
} from '../utils/EnvironmentUtils';

// =============================================================================
// MESSAGE BRIDGES
// =============================================================================

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
    return isWindowAvailable() && isWorkerAPIAvailable();
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

/**
 * Worker-side bridge for communicating with the main thread
 */
export class WorkerMessageBridge extends BaseMessageBridge {
  private transport: MessageTransport;
  private logger?: Logger;

  constructor(transport: MessageTransport, logger?: Logger) {
    super();
    this.transport = transport;
    this.logger = logger;
  }

  protected isEnvironmentSupported(): boolean {
    return isWorkerThread();
  }

  createConnection(): MessageConnection {
    const reader = createTransportMessageReader(this.transport, this.logger);
    const writer = createTransportMessageWriter(this.transport, this.logger);
    return super.createConnection(reader, writer, 'Worker', this.logger);
  }

  /**
   * Creates a worker-to-main-thread message bridge for server-side communication
   */
  static forWorkerServer(logger?: Logger): MessageConnection {
    const transport = new SelfMessageTransport();
    const bridge = new WorkerMessageBridge(transport, logger);
    return bridge.createConnection();
  }

  /**
   * Creates a message connection from worker config (platform bridge method)
   */
  static createConnection(config: WorkerConfig): MessageConnection {
    return WorkerMessageBridge.forWorkerServer(config.logger);
  }
}
