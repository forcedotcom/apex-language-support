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
import { SelfMessageTransport } from './MessageTransports';
import type { MessageTransport } from '@salesforce/apex-lsp-shared';
import type { WorkerConfig } from './Interfaces';

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
    return WorkerMessageBridge.isWorkerEnvironment();
  }

  static isWorkerEnvironment(): boolean {
    // Use the same logic as the environment detector
    return (
      typeof self !== 'undefined' &&
      typeof (self as any).importScripts === 'function'
    );
  }

  createConnection(): MessageConnection {
    const reader = createTransportMessageReader(this.transport, this.logger);
    const writer = createTransportMessageWriter(this.transport, this.logger);
    return super.createConnection(reader, writer, 'Worker', this.logger);
  }

  /**
   * Creates a worker-to-main-thread message bridge for server-side communication
   */
  static forWorkerServer(
    workerScopeOrLogger?: any | Logger,
    logger?: Logger,
  ): MessageConnection {
    let actualLogger: Logger | undefined;
    let workerScope: any | undefined;

    // Handle overloaded parameters
    if (
      typeof workerScopeOrLogger === 'object' &&
      workerScopeOrLogger &&
      'postMessage' in workerScopeOrLogger
    ) {
      workerScope = workerScopeOrLogger;
      actualLogger = logger;
    } else if (
      typeof workerScopeOrLogger === 'object' &&
      workerScopeOrLogger &&
      ('info' in workerScopeOrLogger || 'warn' in workerScopeOrLogger)
    ) {
      actualLogger = workerScopeOrLogger;
    }

    const transport = new SelfMessageTransport(workerScope);
    const bridge = new WorkerMessageBridge(transport, actualLogger);
    return bridge.createConnection();
  }

  /**
   * Creates a message connection from worker config (platform bridge method)
   */
  static createConnection(config: WorkerConfig): MessageConnection {
    return WorkerMessageBridge.forWorkerServer(config.logger);
  }
}
