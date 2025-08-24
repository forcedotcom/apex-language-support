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
  createTransportMessageWriter 
} from './MessageBridge';
import { WorkerMessageTransport, SelfMessageTransport } from './transports';
import type { MessageTransport } from './types';

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
    return typeof window !== 'undefined' && typeof Worker !== 'undefined';
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
    return typeof self !== 'undefined' && typeof (self as any).importScripts === 'function';
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
}