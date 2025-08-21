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
import { isBrowserEnvironment } from '../utils/EnvironmentDetector';

/**
 * Web Worker message transport implementation for browser contexts
 * This handles communication from the browser main thread TO a worker
 */
export class WorkerMessageTransport implements MessageTransport {
  constructor(private worker: Worker) {}

  async send(message: any): Promise<void> {
    this.worker.postMessage(message);
  }

  listen(handler: (message: any) => void): { dispose(): void } {
    const messageHandler = (event: MessageEvent) => {
      handler(event.data);
    };

    this.worker.addEventListener('message', messageHandler);

    return {
      dispose: () => {
        this.worker.removeEventListener('message', messageHandler);
      },
    };
  }

  onError(handler: (error: Error) => void): { dispose(): void } {
    const errorHandler = (event: ErrorEvent) => {
      const error = new Error(event.message || 'Worker error');
      handler(error);
    };

    this.worker.addEventListener('error', errorHandler);

    return {
      dispose: () => {
        this.worker.removeEventListener('error', errorHandler);
      },
    };
  }

  dispose(): void {
    // Worker cleanup is handled by the client
  }
}

/**
 * Browser-specific message bridge implementation
 * Handles communication between browser main thread and web workers
 */
export class BrowserMessageBridge {
  /**
   * Creates a message bridge for communication with a web worker
   */
  static forWorkerClient(worker: Worker, logger?: Logger): MessageConnection {
    const transport = new WorkerMessageTransport(worker);
    const reader = createTransportMessageReader(transport, logger);
    const writer = createTransportMessageWriter(transport, logger);

    const connection = createMessageConnection(reader, writer, logger);

    // Handle connection errors
    connection.onError((error) => {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      logger?.error(`Message connection error: ${errorMessage}`);
    });

    connection.onClose(() => {
      logger?.info('Message connection closed');
      transport.dispose();
    });

    return connection;
  }

  /**
   * Detects if current environment is browser
   */
  static isBrowserEnvironment(): boolean {
    return isBrowserEnvironment();
  }
}

/**
 * Creates a platform message bridge for browser environments
 */
export function createBrowserMessageBridge(logger?: Logger): MessageConnection {
  if (!BrowserMessageBridge.isBrowserEnvironment()) {
    throw new Error('Browser environment not available');
  }

  // In browser context, we need a worker to communicate with
  // This would typically be provided by the caller
  throw new Error(
    'Browser message bridge requires a worker instance. Use BrowserMessageBridge.forWorkerClient(worker) instead.',
  );
}
