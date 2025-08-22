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
} from './MessageBridge';
import type { MessageTransport } from './interfaces';
import { isBrowserEnvironment } from '../utils/EnvironmentDetector';

// =============================================================================
// TRANSPORT IMPLEMENTATIONS
// =============================================================================

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

// =============================================================================
// BROWSER MESSAGE BRIDGE
// =============================================================================

/**
 * Browser-specific message bridge implementation
 * Handles communication between browser main thread and web workers
 */
export class BrowserMessageBridge extends BaseMessageBridge {
  /**
   * Creates a message bridge for communication with a web worker
   */
  static forWorkerClient(worker: Worker, logger?: Logger): MessageConnection {
    const instance = new BrowserMessageBridge();
    instance.checkEnvironment('Browser');

    const transport = new WorkerMessageTransport(worker);
    const reader = createTransportMessageReader(transport, logger);
    const writer = createTransportMessageWriter(transport, logger);

    return instance.createConnection(reader, writer, 'Browser', logger, () =>
      transport.dispose(),
    );
  }

  /**
   * Checks if current environment is supported
   */
  protected isEnvironmentSupported(): boolean {
    return isBrowserEnvironment();
  }
}

/**
 * Creates a platform message bridge for browser environments
 */
export function createBrowserMessageBridge(
  _logger?: Logger,
): MessageConnection {
  // In browser context, we need a worker to communicate with
  // This would typically be provided by the caller
  throw new Error(
    'Browser message bridge requires a worker instance. Use BrowserMessageBridge.forWorkerClient(worker) instead.',
  );
}

// =============================================================================
// WORKER MESSAGE BRIDGE
// =============================================================================

/**
 * Worker-specific message bridge implementation
 * Handles communication from within a web worker back to the main thread
 */
export class WorkerMessageBridge extends BaseMessageBridge {
  /**
   * Creates a message bridge for worker server communication
   */
  static forWorkerServer(
    workerScope: DedicatedWorkerGlobalScope,
    logger?: Logger,
  ): MessageConnection {
    const instance = new WorkerMessageBridge();
    instance.checkEnvironment('Worker');

    const transport = new SelfMessageTransport(workerScope);
    const reader = createTransportMessageReader(transport, logger);
    const writer = createTransportMessageWriter(transport, logger);

    return instance.createConnection(reader, writer, 'Worker', logger, () =>
      transport.dispose(),
    );
  }

  /**
   * Checks if current environment is supported
   */
  protected isEnvironmentSupported(): boolean {
    return typeof self !== 'undefined' && typeof importScripts !== 'undefined';
  }
}

/**
 * Creates a platform message bridge for worker environments
 */
export function createWorkerMessageBridge(logger?: Logger): MessageConnection {
  return WorkerMessageBridge.forWorkerServer(
    self as DedicatedWorkerGlobalScope,
    logger,
  );
}
