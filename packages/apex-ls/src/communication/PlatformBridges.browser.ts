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
import { isBrowserEnvironment } from '../utils/EnvironmentDetector.browser';

/**
 * Browser-specific message bridge implementation
 * Handles communication with web workers in browser environments
 */
export class BrowserMessageBridge extends BaseMessageBridge {
  /**
   * Creates a message connection for communicating with a worker
   */
  static forWorkerClient(worker: Worker, logger?: Logger): MessageConnection {
    const instance = new BrowserMessageBridge();
    instance.checkEnvironment('Browser');

    const transport: MessageTransport = {
      send: async (data) => worker.postMessage(data),
      listen: (callback) => {
        const listener = (event: MessageEvent) => callback(event.data);
        worker.addEventListener('message', listener);
        return {
          dispose: () => worker.removeEventListener('message', listener),
        };
      },
      onError: (callback) => {
        const listener = (event: ErrorEvent) =>
          callback(new Error(event.message));
        worker.addEventListener('error', listener);
        return {
          dispose: () => worker.removeEventListener('error', listener),
        };
      },
      dispose: () => worker.terminate(),
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

    return instance.createConnection(reader, writer, 'Browser', logger);
  }

  /**
   * Checks if current environment is supported
   */
  protected isEnvironmentSupported(): boolean {
    return isBrowserEnvironment();
  }
}
