/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

// Import from the main protocol package but don't use browser-specific imports
// which may not be available directly
import {
  createMessageConnection as createProtocolMessageConnection,
  Event,
  MessageReader as ProtocolMessageReader,
  MessageWriter as ProtocolMessageWriter,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, unused-imports/no-unused-imports
  Message,
} from 'vscode-languageserver-protocol';

/**
 * Connection strategy for message connections
 */
export interface ConnectionStrategy {}

// Event interface for partial message information
export interface PartialMessageInfo {
  messageToken: number;
  waitingTime: number;
}

// Simple event implementation
type Listener<T> = (e: T) => any;
export interface Disposable {
  dispose(): void;
}

export interface SimpleEvent<T> {
  (listener: Listener<T>): Disposable;
}

/**
 * Message reader interface for worker communication
 */
export interface MessageReader {
  listen: (callback: (message: any) => void) => Disposable;
  onError: SimpleEvent<Error>;
  onClose: SimpleEvent<void>;
  onPartialMessage: SimpleEvent<PartialMessageInfo>;
  dispose: () => void;
}

/**
 * Message writer interface for worker communication
 */
export interface MessageWriter {
  write: (msg: any) => Promise<void>;
  onError: SimpleEvent<Error>;
  onClose: SimpleEvent<void>;
  end: () => void;
  dispose: () => void;
}

/**
 * Logger interface
 */
export interface Logger {
  error(message: string): void;
  warn(message: string): void;
  info(message: string): void;
  log(message: string): void;
}

/**
 * Message connection interface
 */
export interface MessageConnection {
  listen(): void;
  dispose(): void;
}

// Helper to adapt our simple event model to the protocol's Event
function createEventAdapter<T, U = T>(
  simpleEvent: SimpleEvent<T>,
  adapter?: (data: T) => U,
): Event<U> {
  return function (listener: (e: U) => any): Disposable {
    return simpleEvent((e) =>
      listener(adapter ? adapter(e) : (e as unknown as U)),
    );
  };
}

/**
 * Creates a message reader that reads messages from a worker
 */
export function createWorkerMessageReader(
  worker: Worker,
): ProtocolMessageReader {
  // Create events
  const onMessageCallbacks: Listener<any>[] = [];
  const onErrorCallbacks: Listener<Error>[] = [];
  const onCloseCallbacks: Listener<void>[] = [];

  const onMessage: SimpleEvent<any> = (listener) => {
    onMessageCallbacks.push(listener);
    return {
      dispose: () => {
        const index = onMessageCallbacks.indexOf(listener);
        if (index >= 0) onMessageCallbacks.splice(index, 1);
      },
    };
  };

  const onError: SimpleEvent<Error> = (listener) => {
    onErrorCallbacks.push(listener);
    return {
      dispose: () => {
        const index = onErrorCallbacks.indexOf(listener);
        if (index >= 0) onErrorCallbacks.splice(index, 1);
      },
    };
  };

  const onClose: SimpleEvent<void> = (listener) => {
    onCloseCallbacks.push(listener);
    return {
      dispose: () => {
        const index = onCloseCallbacks.indexOf(listener);
        if (index >= 0) onCloseCallbacks.splice(index, 1);
      },
    };
  };

  // Set up worker listeners
  worker.onmessage = (event) => {
    onMessageCallbacks.forEach((cb) => cb(event.data));
  };

  worker.onerror = (event) => {
    const error = new Error(`Worker error: ${event.message}`);
    onErrorCallbacks.forEach((cb) => cb(error));
  };

  // Create appropriate event types for protocol
  const errorEvent: Event<Error> = createEventAdapter(onError);
  const closeEvent: Event<void> = createEventAdapter(onClose);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const partialMessageEvent: Event<PartialMessageInfo> = function (listener) {
    // This never actually emits events
    return { dispose: () => {} };
  };

  // Adapt to the protocol interface
  return {
    listen: (callback) => onMessage(callback),
    onError: errorEvent,
    onClose: closeEvent,
    onPartialMessage: partialMessageEvent,
    dispose: () => {
      worker.onmessage = null;
      worker.onerror = null;
    },
  };
}

/**
 * Creates a message writer that writes messages to a worker
 */
export function createWorkerMessageWriter(
  worker: Worker,
): ProtocolMessageWriter {
  // Create events
  const onErrorCallbacks: Listener<Error>[] = [];
  const onCloseCallbacks: Listener<void>[] = [];

  const onError: SimpleEvent<Error> = (listener) => {
    onErrorCallbacks.push(listener);
    return {
      dispose: () => {
        const index = onErrorCallbacks.indexOf(listener);
        if (index >= 0) onErrorCallbacks.splice(index, 1);
      },
    };
  };

  const onClose: SimpleEvent<void> = (listener) => {
    onCloseCallbacks.push(listener);
    return {
      dispose: () => {
        const index = onCloseCallbacks.indexOf(listener);
        if (index >= 0) onCloseCallbacks.splice(index, 1);
      },
    };
  };

  // Create events for protocol
  const errorEvent: Event<Error> = createEventAdapter(onError);
  const closeEvent: Event<void> = createEventAdapter(onClose);

  return {
    write: (msg) => {
      worker.postMessage(msg);
      return Promise.resolve();
    },
    onError: errorEvent,
    onClose: closeEvent,
    end: () => {},
    dispose: () => {},
  };
}

/**
 * Creates a connection to the Apex Language Server running in a web worker
 */
export function createApexLspConnection(
  options: ApexLspClientOptions,
): MessageConnection {
  const reader = createWorkerMessageReader(options.worker);
  const writer = createWorkerMessageWriter(options.worker);

  return createMessageConnection(
    reader,
    writer,
    options.logger,
    options.connectionStrategy,
  );
}

/**
 * Configuration options for the Apex Language Server browser client
 */
export interface ApexLspClientOptions {
  /**
   * The Worker instance running the language server
   */
  worker: Worker;

  /**
   * Optional logger for the connection
   */
  logger?: Logger;

  /**
   * Optional connection strategy
   */
  connectionStrategy?: ConnectionStrategy;
}

/**
 * Main class for the Apex Language Server browser client
 */
export class ApexLspBrowserClient {
  private connection: MessageConnection;
  private worker: Worker;

  /**
   * Creates a new Apex LSP browser client
   *
   * @param options The client options
   */
  constructor(options: ApexLspClientOptions) {
    this.worker = options.worker;
    this.connection = createApexLspConnection(options);
    this.connection.listen();
  }

  /**
   * Gets the underlying message connection
   *
   * @returns The message connection to the language server
   */
  getConnection(): MessageConnection {
    return this.connection;
  }

  /**
   * Terminates the client and disposes resources
   */
  dispose(): void {
    this.connection.dispose();
    this.worker.terminate();
  }
}

// Use the protocol's standard createMessageConnection
export function createMessageConnection(
  reader: ProtocolMessageReader,
  writer: ProtocolMessageWriter,
  logger?: Logger,
  connectionStrategy?: ConnectionStrategy,
): MessageConnection {
  return createProtocolMessageConnection(
    reader,
    writer,
    logger,
    connectionStrategy,
  );
}

// Re-export the LSP protocol for convenience
export * from 'vscode-languageserver-protocol';
