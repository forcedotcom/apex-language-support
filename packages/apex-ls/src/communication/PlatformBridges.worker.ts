/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { MessageConnection, Logger, Message } from 'vscode-jsonrpc';
import type { MessageTransport } from './interfaces';
import { BaseMessageBridge } from './MessageBridge';
import { isWorkerEnvironment } from '../utils/EnvironmentDetector.worker';

/**
 * Worker-specific message bridge implementation
 * Handles communication in web worker environments
 */
export class WorkerMessageBridge extends BaseMessageBridge {
  /**
   * Creates a message connection for a worker server
   */
  static forWorkerServer(
    workerScope: DedicatedWorkerGlobalScope,
    logger?: Logger,
  ): MessageConnection {
    const instance = new WorkerMessageBridge();
    instance.checkEnvironment('Worker');

    const transport: MessageTransport = {
      send: async (data) => workerScope.postMessage(data),
      listen: (callback) => {
        const listener = (event: MessageEvent) => callback(event.data);
        workerScope.addEventListener('message', listener);
        return {
          dispose: () => workerScope.removeEventListener('message', listener),
        };
      },
      onError: (handler) => {
        const listener = (event: ErrorEvent) =>
          handler(new Error(event.message));
        workerScope.addEventListener('error', listener);
        return {
          dispose: () => workerScope.removeEventListener('error', listener),
        };
      },
      dispose: () => {},
    };

    const reader = {
      listen: transport.listen,
      onError: transport.onError,
      onClose: (handler: () => void) => ({
        dispose: () => {},
      }),
      onPartialMessage: (handler: (info: any) => void) => ({
        dispose: () => {},
      }),
      dispose: transport.dispose,
    };

    const writer = {
      write: transport.send,
      onError: (
        handler: (
          error: [Error, Message | undefined, number | undefined],
        ) => void,
      ) => {
        const wrappedHandler = (error: Error) =>
          handler([error, undefined, undefined]);
        return transport.onError(wrappedHandler);
      },
      onClose: (handler: () => void) => ({
        dispose: () => {},
      }),
      dispose: transport.dispose,
      end: () => {},
    };

    return instance.createConnection(reader, writer, 'Worker', logger);
  }

  /**
   * Checks if current environment is supported
   */
  protected isEnvironmentSupported(): boolean {
    return isWorkerEnvironment();
  }
}
