/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type {
  MessageConnection,
  MessageReader,
  MessageWriter,
  Logger,
} from 'vscode-jsonrpc';
import {
  createMessageConnection,
  ResponseError,
  ErrorCodes,
} from 'vscode-jsonrpc';
import type { MessageTransport } from './MessageTransport';
import {
  createTransportMessageReader,
  createTransportMessageWriter,
} from './TransportMessageHandlers';

/**
 * Self (Web Worker context) message transport implementation
 * This handles communication from WITHIN a worker back to the main thread
 */
export class SelfMessageTransport implements MessageTransport {
  constructor(private self: DedicatedWorkerGlobalScope) {}

  async send(message: any): Promise<void> {
    this.self.postMessage(message);
  }

  listen(handler: (message: any) => void): { dispose(): void } {
    const messageHandler = (event: MessageEvent) => {
      handler(event.data);
    };

    this.self.addEventListener('message', messageHandler);

    return {
      dispose: () => {
        this.self.removeEventListener('message', messageHandler);
      },
    };
  }

  onError(handler: (error: Error) => void): { dispose(): void } {
    const errorHandler = (event: ErrorEvent) => {
      const error = new Error(event.message || 'Self error');
      handler(error);
    };

    this.self.addEventListener('error', errorHandler);

    return {
      dispose: () => {
        this.self.removeEventListener('error', errorHandler);
      },
    };
  }

  dispose(): void {
    // Self cleanup is minimal
  }
}

/**
 * Worker-specific message bridge implementation
 * Handles communication from within a web worker back to the main thread
 */
export class WorkerMessageBridge {
  /**
   * Creates a message bridge for worker server communication
   */
  static forWorkerServer(
    workerScope: DedicatedWorkerGlobalScope,
    logger?: Logger,
  ): MessageConnection {
    const transport = new SelfMessageTransport(workerScope);
    const reader = createTransportMessageReader(transport, logger);
    const writer = createTransportMessageWriter(transport, logger);

    const connection = createMessageConnection(reader, writer, logger);

    // Handle connection errors
    connection.onError((error) => {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      logger?.error(`Worker message connection error: ${errorMessage}`);
    });

    connection.onClose(() => {
      logger?.info('Worker message connection closed');
      transport.dispose();
    });

    return connection;
  }

  /**
   * Detects if current environment is web worker
   */
  static isWorkerEnvironment(): boolean {
    return typeof self !== 'undefined' && typeof importScripts !== 'undefined';
  }
}

/**
 * Creates a platform message bridge for worker environments
 */
export function createWorkerMessageBridge(logger?: Logger): MessageConnection {
  if (!WorkerMessageBridge.isWorkerEnvironment()) {
    throw new Error('Web worker environment not available');
  }

  return WorkerMessageBridge.forWorkerServer(
    self as DedicatedWorkerGlobalScope,
    logger,
  );
}
