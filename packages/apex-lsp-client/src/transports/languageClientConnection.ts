/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { BaseLanguageClient, State } from 'vscode-languageclient';
import type { Disposable } from '@salesforce/apex-lsp-shared';
import type { RpcConnection } from '../rpcConnection';

/**
 * Adapter wrapping a `vscode-languageclient` {@link BaseLanguageClient} to
 * satisfy the SDK's {@link RpcConnection} port.
 *
 * This allows `ApexClientCore` to operate over a running `LanguageClient`
 * managed by a VS Code extension, consolidating the two hand-rolled
 * `ClientInterface` implementations in `language-server.ts`.
 *
 * Lifecycle mapping:
 * - `isListening()` → `client.isRunning()`
 * - `dispose()` → `client.stop()`
 * - `onClose` / `onError` → synthesized from `client.onDidChangeState`
 *
 * Cancellation: `RpcConnection.sendRequest` is intentionally token-free.
 * `BaseLanguageClient.sendRequest(method, params, token?)` accepts an optional
 * `CancellationToken`, but when omitted the underlying `vscode-jsonrpc` layer
 * simply never sends `$/cancelRequest`. This adapter does NOT support request
 * cancellation via `CancellationToken`. See plan Cancellation decision.
 */
export class LanguageClientConnection implements RpcConnection {
  private readonly client: BaseLanguageClient;

  constructor(client: BaseLanguageClient) {
    this.client = client;
  }

  sendRequest<R>(method: string, params?: unknown): Promise<R> {
    return this.client.sendRequest<R>(method, params);
  }

  sendNotification(method: string, params?: unknown): Promise<void> {
    if (params === undefined) {
      return this.client.sendNotification(method);
    }
    return this.client.sendNotification(method, params);
  }

  onRequest(method: string, handler: (params: unknown) => unknown): Disposable {
    return this.client.onRequest(method, handler);
  }

  onNotification(
    method: string,
    handler: (params: unknown) => void,
  ): Disposable {
    return this.client.onNotification(method, handler);
  }

  /**
   * Subscribe to connection-level errors. Since `BaseLanguageClient` has no
   * direct `onError` event, this synthesizes an error when the client
   * transitions to `Stopped` unexpectedly (i.e., the previous state was not
   * `Stopped`).
   */
  onError(handler: (e: Error) => void): Disposable {
    const disposable = this.client.onDidChangeState((event) => {
      // State enum: Stopped = 1, Starting = 3, Running = 4
      const STOPPED: State = 1 as State;
      if (event.newState === STOPPED && event.oldState !== STOPPED) {
        handler(new Error('Language client stopped unexpectedly'));
      }
    });
    return disposable;
  }

  /**
   * Subscribe to transport close. Fires when the client transitions to
   * `Stopped` from any other state.
   */
  onClose(handler: () => void): Disposable {
    const disposable = this.client.onDidChangeState((event) => {
      const STOPPED: State = 1 as State;
      if (event.newState === STOPPED && event.oldState !== STOPPED) {
        handler();
      }
    });
    return disposable;
  }

  /**
   * Check if the client is actively running and ready to process requests.
   */
  isListening(): boolean {
    return this.client.isRunning();
  }

  /**
   * Tear down the language client by calling `stop()`.
   */
  dispose(): Promise<void> {
    return this.client.stop();
  }
}
