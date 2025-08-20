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
import type { EnvironmentType } from '../types';

/**
 * Platform-agnostic message transport interface
 */
export interface MessageTransport {
  /**
   * Sends a message to the target
   */
  send(message: any): Promise<void>;

  /**
   * Sets up message listening
   */
  listen(handler: (message: any) => void): { dispose(): void };

  /**
   * Sets up error handling
   */
  onError(handler: (error: Error) => void): { dispose(): void };

  /**
   * Disposes the transport
   */
  dispose(): void;
}

/**
 * Web Worker message transport implementation
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
 * Creates a message reader from a transport
 */
function createTransportMessageReader(transport: MessageTransport): MessageReader {
  let messageListener: { dispose(): void } | undefined;
  let errorListener: { dispose(): void } | undefined;

  return {
    listen: (callback) => {
      messageListener = transport.listen(callback);
      return messageListener;
    },
    onError: (listener) => {
      errorListener = transport.onError(listener);
      return errorListener;
    },
    onClose: () => ({ dispose: () => {} }),
    onPartialMessage: () => ({ dispose: () => {} }),
    dispose: () => {
      messageListener?.dispose();
      errorListener?.dispose();
      transport.dispose();
    },
  };
}

/**
 * Creates a message writer from a transport
 */
function createTransportMessageWriter(transport: MessageTransport): MessageWriter {
  return {
    write: (msg) => transport.send(msg),
    onError: () => ({ dispose: () => {} }),
    onClose: () => ({ dispose: () => {} }),
    end: () => {},
    dispose: () => {
      transport.dispose();
    },
  };
}

/**
 * Platform-agnostic message bridge for LSP communication
 */
export class MessageBridge {
  private connection: MessageConnection | undefined;
  private transport: MessageTransport | undefined;

  /**
   * Creates a message bridge for web worker client communication
   */
  static forWorkerClient(worker: Worker, logger?: Logger): MessageBridge {
    const bridge = new MessageBridge();
    bridge.transport = new WorkerMessageTransport(worker);
    bridge.connection = bridge.createConnection(logger);
    return bridge;
  }

  /**
   * Creates a message bridge for web worker server communication
   */
  static forWorkerServer(
    self: DedicatedWorkerGlobalScope,
    logger?: Logger,
  ): MessageBridge {
    const bridge = new MessageBridge();
    bridge.transport = new SelfMessageTransport(self);
    bridge.connection = bridge.createConnection(logger);
    return bridge;
  }

  /**
   * Creates a message connection from the transport
   */
  private createConnection(logger?: Logger): MessageConnection {
    if (!this.transport) {
      throw new Error('Transport not initialized');
    }

    const reader = createTransportMessageReader(this.transport);
    const writer = createTransportMessageWriter(this.transport);
    return createMessageConnection(reader, writer, logger);
  }

  /**
   * Gets the underlying message connection
   */
  getConnection(): MessageConnection {
    if (!this.connection) {
      throw new Error('Connection not initialized');
    }
    return this.connection;
  }

  /**
   * Starts listening for messages
   */
  listen(): void {
    this.connection?.listen();
  }

  /**
   * Disposes the bridge and underlying resources
   */
  dispose(): void {
    this.connection?.dispose();
    this.transport?.dispose();
  }
}

/**
 * Auto-detects the environment and creates appropriate message bridge
 */
export function createPlatformMessageBridge(logger?: Logger): MessageBridge {
  // Detect environment
  const environment = detectEnvironment();

  switch (environment) {
    case 'webworker':
      if (typeof self !== 'undefined') {
        return MessageBridge.forWorkerServer(
          self as DedicatedWorkerGlobalScope,
          logger,
        );
      }
      throw new Error('Web worker context not available');

    case 'browser':
    case 'node':
    default:
      throw new Error(
        `Platform message bridge not supported for environment: ${environment}`,
      );
  }
}

/**
 * Detects the current runtime environment
 */
function detectEnvironment(): EnvironmentType {
  // Check for web worker environment (both classic and ES module workers)
  // ES module workers don't have importScripts, so we check for self and lack of window/document
  if (
    typeof self !== 'undefined' &&
    typeof window === 'undefined' &&
    typeof document === 'undefined'
  ) {
    return 'webworker';
  }

  // Check for browser environment
  if (typeof window !== 'undefined') {
    return 'browser';
  }

  // Default to Node.js
  return 'node';
}