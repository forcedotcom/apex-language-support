/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { MessageConnection } from 'vscode-jsonrpc';
import type { Disposable } from '@salesforce/apex-lsp-shared';
import type { RpcConnection } from '../rpcConnection';

/**
 * Thin adapter wrapping a `vscode-jsonrpc` {@link MessageConnection} to satisfy
 * the SDK's {@link RpcConnection} port. Every method delegates 1:1; no logic
 * beyond flattening the `onError` tuple lives here.
 *
 * Usage pattern (load-bearing ordering):
 * 1. Create `MessageConnection` (via `createMessageConnection` / helper)
 * 2. Wrap: `new JsonRpcConnection(messageConnection)`
 * 3. Build core: `ApexClientCore.create(jsonRpcConnection)` — registers handlers
 * 4. Start traffic: `jsonRpcConnection.listen()`
 *
 * The adapter does NOT call `listen()` in its constructor so the core has the
 * chance to register request handlers before any messages flow.
 */
export class JsonRpcConnection implements RpcConnection {
  private readonly connection: MessageConnection;
  private listening = false;

  constructor(connection: MessageConnection) {
    this.connection = connection;
  }

  sendRequest<R>(method: string, params?: unknown): Promise<R> {
    return this.connection.sendRequest<R>(method, params);
  }

  sendNotification(method: string, params?: unknown): Promise<void> {
    return this.connection.sendNotification(method, params);
  }

  onRequest(method: string, handler: (params: unknown) => unknown): Disposable {
    return this.connection.onRequest(method, handler);
  }

  onNotification(
    method: string,
    handler: (params: unknown) => void,
  ): Disposable {
    return this.connection.onNotification(method, handler);
  }

  onError(handler: (e: Error) => void): Disposable {
    // `MessageConnection.onError` emits a tuple `[Error, Message | undefined,
    // number | undefined]`. The RpcConnection port exposes only the Error;
    // flatten here.
    return this.connection.onError(([error]) => {
      handler(error);
    });
  }

  onClose(handler: () => void): Disposable {
    return this.connection.onClose(handler);
  }

  dispose(): void {
    this.connection.dispose();
  }

  /**
   * Check if the connection is actively listening for messages.
   */
  isListening(): boolean {
    return this.listening;
  }

  /**
   * Start listening on the underlying connection. Call this AFTER
   * `ApexClientCore.create(...)` so handlers are registered before traffic flows.
   */
  listen(): void {
    this.connection.listen();
    this.listening = true;
  }
}
