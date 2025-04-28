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
} from 'vscode-jsonrpc/browser';

/**
 * Logger interface for the Apex Language Server browser client
 */
export interface Logger {
  error(message: string): void;
  warn(message: string): void;
  info(message: string): void;
  log(message: string): void;
}

/**
 * Creates a message reader that reads messages from a worker
 */
export function createWorkerMessageReader(worker: Worker): MessageReader {
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
export function createWorkerMessageWriter(worker: Worker): MessageWriter {
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
export function createApexLspConnection(worker: Worker, logger?: Logger) {
  const reader = createWorkerMessageReader(worker);
  const writer = createWorkerMessageWriter(worker);
  return createMessageConnection(reader, writer, logger);
}

/**
 * Main class for the Apex Language Server browser client
 */
export class ApexLspBrowserClient {
  private connection: ReturnType<typeof createMessageConnection>;
  private worker: Worker;

  /**
   * Creates a new Apex LSP browser client
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
   * Terminates the client and disposes resources
   */
  dispose() {
    this.connection.dispose();
    this.worker.terminate();
  }
}

// Re-export the LSP protocol for convenience
export * from 'vscode-languageserver-protocol';
