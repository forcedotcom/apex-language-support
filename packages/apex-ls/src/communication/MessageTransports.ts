/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { MessageTransport } from './Interfaces';

// =============================================================================
// BROWSER/WORKER TRANSPORTS
// =============================================================================

/**
 * Transport for browser main thread communicating TO a worker
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
    // Worker disposal is handled externally
    // This transport just manages event listeners
  }
}

/**
 * Transport for worker contexts communicating with the main thread
 */
export class SelfMessageTransport implements MessageTransport {
  private selfContext: DedicatedWorkerGlobalScope;

  constructor() {
    if (typeof self === 'undefined' || !('postMessage' in self)) {
      throw new Error(
        'SelfMessageTransport can only be used in a worker context',
      );
    }
    this.selfContext = self as any;
  }

  async send(message: any): Promise<void> {
    this.selfContext.postMessage(message);
  }

  listen(handler: (message: any) => void): { dispose(): void } {
    const messageHandler = (event: MessageEvent) => {
      handler(event.data);
    };

    this.selfContext.addEventListener('message', messageHandler);

    return {
      dispose: () => {
        this.selfContext.removeEventListener('message', messageHandler);
      },
    };
  }

  onError(handler: (error: Error) => void): { dispose(): void } {
    const errorHandler = (event: ErrorEvent) => {
      const error = new Error(event.message || 'Worker error');
      handler(error);
    };

    this.selfContext.addEventListener('error', errorHandler);

    return {
      dispose: () => {
        this.selfContext.removeEventListener('error', errorHandler);
      },
    };
  }

  dispose(): void {
    // Self context disposal is handled externally
  }
}
