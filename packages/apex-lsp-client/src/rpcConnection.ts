/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { Disposable } from '@salesforce/apex-lsp-shared';

/**
 * The single narrow transport port `ApexClientCore` is written against.
 *
 * `ApexClientCore` depends on `RpcConnection` only — never on `vscode-jsonrpc`,
 * `vscode-languageclient`, or `vscode`. Concrete transports plug in via thin
 * adapters in later work items:
 * - `JsonRpcConnection` (2.3) wraps a `vscode-jsonrpc` `MessageConnection`
 *   (headless host); methods map 1:1.
 * - `LanguageClientConnection` (4.1) wraps a `BaseLanguageClient` (embedded /
 *   VS Code host); it consolidates the two existing `ClientInterface`
 *   implementations in `apex-lsp-vscode-extension/src/language-server.ts`,
 *   translating the `CancellationToken` cancellation model and returning a real
 *   `Disposable` from `onRequest`.
 *
 * How this differs from the shared `ClientInterface`
 * (`@salesforce/apex-lsp-shared`, `communication/Interfaces.ts`) — adapter WIs
 * must honor these so the port is satisfied, not merely `ClientInterface`:
 * - `onRequest` returns a `Disposable` here; `ClientInterface.onRequest` returns
 *   `void`. The core must be able to unregister a request handler (e.g. when a
 *   per-host handler replaces a default), so the registration is disposable.
 * - `onError` and `onClose` are added here; `ClientInterface` has neither.
 *   Connection-level errors surface via `onError`; transport close via
 *   `onClose`. The core will wire lifecycle/observability to these in a later
 *   work item; it does not register either handler yet.
 * - No `initialize`/`isDisposed` on the port. Lifecycle (the LSP
 *   `initialize`/`initialized`/`shutdown`/`exit` handshake and disposed state)
 *   is owned by `ApexClientCore`, not the transport. The port is purely the
 *   send/receive/teardown surface.
 * - `sendNotification` may be sync or async (`void | Promise<void>`), matching
 *   transports whose notification write is fire-and-forget.
 *
 * Cancellation: the underlying `vscode-jsonrpc` request carries a
 * `CancellationToken`. The port keeps `sendRequest` token-free for now; the
 * `LanguageClientConnection` adapter (4.1) is responsible for bridging the
 * `BaseLanguageClient` token model when it lands.
 *
 * `RpcConnection` is a NEW port that lives in this SDK package; it does not touch
 * the shared `ClientInterface`, so existing implementors continue to compile
 * unchanged. Unification of the extension's hand-rolled clients onto the core
 * happens in 4.1.
 */
export interface RpcConnection {
  /**
   * Send an LSP request and resolve with the server's typed result.
   */
  sendRequest<R>(method: string, params?: unknown): Promise<R>;

  /**
   * Send an LSP notification (no response). May be sync or async depending on
   * the transport's write model.
   */
  sendNotification(method: string, params?: unknown): Promise<void> | void;

  /**
   * Register a handler for an incoming (server→client) request. Returns a
   * `Disposable` that unregisters the handler. Params are `unknown`: a typed
   * handler narrows them (the typed `apex/*` surface lands in 3.1).
   */
  onRequest(method: string, handler: (params: unknown) => unknown): Disposable;

  /**
   * Register a handler for an incoming (server→client) notification. Returns a
   * `Disposable` that unregisters the handler. Params are `unknown`: a typed
   * handler narrows them (the typed `apex/*` surface lands in 3.1).
   */
  onNotification(
    method: string,
    handler: (params: unknown) => void,
  ): Disposable;

  /**
   * Register a handler for connection-level errors. Returns a `Disposable` that
   * unregisters the handler.
   */
  onError(handler: (e: Error) => void): Disposable;

  /**
   * Register a handler for transport close. Returns a `Disposable` that
   * unregisters the handler.
   */
  onClose(handler: () => void): Disposable;

  /**
   * Tear down the transport. May be sync or async.
   */
  dispose(): void | Promise<void>;

  /**
   * Check if the connection is actively listening for messages.
   * Used to enforce the precondition that ApexClientCore.create() must receive
   * a not-yet-listening connection so handlers can be registered before traffic flows.
   */
  isListening?(): boolean;
}
