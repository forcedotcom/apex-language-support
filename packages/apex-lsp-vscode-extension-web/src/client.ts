/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  createMessageConnection,
  MessageReader,
  MessageWriter,
  ResponseError,
  ErrorCodes,
  Logger,
} from 'vscode-jsonrpc';
import type {
  InitializeParams,
  InitializeResult,
} from 'vscode-languageserver-protocol';
import type { ApexLspClientOptions, LanguageServerInitResult } from './types';

/**
 * Creates a message reader that reads messages from a worker
 */
function createWorkerMessageReader(worker: Worker): MessageReader {
  return {
    listen: (callback) => {
      worker.onmessage = (event) => callback(event.data);
      return {
        dispose: () => {
          worker.onmessage = null;
        },
      };
    },
    onError: (listener) => {
      worker.onerror = (event) => {
        const error = new ResponseError(
          ErrorCodes.InternalError,
          `Worker error: ${event.message}`,
        );
        listener(error);
      };
      return {
        dispose: () => {
          worker.onerror = null;
        },
      };
    },
    onClose: () => ({ dispose: () => {} }),
    onPartialMessage: () => ({ dispose: () => {} }),
    dispose: () => {
      worker.onmessage = null;
      worker.onerror = null;
    },
  };
}

/**
 * Creates a message writer that writes messages to a worker
 */
function createWorkerMessageWriter(worker: Worker): MessageWriter {
  return {
    write: (msg) => {
      worker.postMessage(msg);
      return Promise.resolve();
    },
    onError: () => ({ dispose: () => {} }),
    onClose: () => ({ dispose: () => {} }),
    end: () => {},
    dispose: () => {},
  };
}

/**
 * Creates a connection to the Apex Language Server running in a web worker
 */
function createApexLspConnection(worker: Worker, logger?: Logger) {
  const reader = createWorkerMessageReader(worker);
  const writer = createWorkerMessageWriter(worker);
  return createMessageConnection(reader, writer, logger);
}

/**
 * Creates an Apex LSP client that connects to a web worker language server
 *
 * @param options Configuration options for the client
 * @returns A client instance that can communicate with the language server
 */
export function createApexLspClient(
  options: ApexLspClientOptions,
): LanguageServerInitResult {
  const { worker, logger, autoListen = true } = options;

  const connection = createApexLspConnection(worker, logger);

  if (autoListen) {
    connection.listen();
  }

  return {
    connection,
    worker,
    initialize: async (params: InitializeParams): Promise<InitializeResult> =>
      connection.sendRequest('initialize', params),
    dispose: () => {
      connection.dispose();
      worker.terminate();
    },
  };
}

/**
 * Main class for the Apex Language Server client
 *
 * This class provides a higher-level interface for interacting with the
 * web worker-based language server.
 */
export class ApexLspClient {
  private connection: ReturnType<typeof createMessageConnection>;
  private worker: Worker;
  private isDisposed = false;

  /**
   * Creates a new Apex LSP client
   *
   * @param worker The Worker instance running the language server
   * @param logger Optional logger for the connection
   */
  constructor(worker: Worker, logger?: Logger) {
    this.worker = worker;
    this.connection = createApexLspConnection(worker, logger);
    this.connection.listen();
  }

  /**
   * Gets the underlying message connection
   *
   * @returns The message connection to the language server
   */
  getConnection() {
    return this.connection;
  }

  /**
   * Gets the worker instance
   *
   * @returns The worker instance
   */
  getWorker() {
    return this.worker;
  }

  /**
   * Initializes the language server with the given parameters
   *
   * @param params The initialization parameters
   * @returns The initialization result
   */
  async initialize(params: InitializeParams): Promise<InitializeResult> {
    if (this.isDisposed) {
      throw new Error('Client has been disposed');
    }
    return this.connection.sendRequest('initialize', params);
  }

  /**
   * Sends a notification to the language server
   *
   * @param method The notification method
   * @param params The notification parameters
   */
  sendNotification(method: string, params?: any): void {
    if (this.isDisposed) {
      throw new Error('Client has been disposed');
    }
    this.connection.sendNotification(method, params);
  }

  /**
   * Sends a request to the language server
   *
   * @param method The request method
   * @param params The request parameters
   * @returns The response from the language server
   */
  async sendRequest<T = any>(method: string, params?: any): Promise<T> {
    if (this.isDisposed) {
      throw new Error('Client has been disposed');
    }
    return this.connection.sendRequest(method, params);
  }

  /**
   * Registers a handler for notifications from the language server
   *
   * @param method The notification method to listen for
   * @param handler The handler function
   */
  onNotification(method: string, handler: (params: any) => void): void {
    if (this.isDisposed) {
      throw new Error('Client has been disposed');
    }
    this.connection.onNotification(method, handler);
  }

  /**
   * Registers a handler for requests from the language server
   *
   * @param method The request method to listen for
   * @param handler The handler function
   */
  onRequest(method: string, handler: (params: any) => any): void {
    if (this.isDisposed) {
      throw new Error('Client has been disposed');
    }
    this.connection.onRequest(method, handler);
  }

  /**
   * Checks if the client has been disposed
   *
   * @returns True if the client has been disposed
   */
  isDisposedClient(): boolean {
    return this.isDisposed;
  }

  /**
   * Terminates the client and disposes resources
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }

    this.connection.dispose();
    this.worker.terminate();
    this.isDisposed = true;
  }
}

// Re-export the LSP protocol for convenience
export * from 'vscode-languageserver-protocol';
