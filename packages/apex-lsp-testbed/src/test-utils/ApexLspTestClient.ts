/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type {
  ApexClientCore,
  ApexClientMiddleware,
  CompletionItem,
  CompletionList,
  CompletionParams,
  Definition,
  DefinitionParams,
  DocumentSymbol,
  DocumentSymbolParams,
  Hover,
  HoverParams,
  LocationLink,
  SymbolInformation,
} from '@salesforce/apex-lsp-client';
import type { Disposable, InitializeResult } from '@salesforce/apex-lsp-shared';

/**
 * Convenience wrapper around `ApexClientCore` that adds testbed-specific
 * methods the SDK intentionally omits: `openTextDocument`, `closeTextDocument`,
 * `isHealthy`, `waitForHealthy`, `getServerCapabilities`.
 *
 * Tests interact with this wrapper rather than `ApexClientCore` directly, so
 * they can call familiar methods (`client.openTextDocument(...)`) while the
 * underlying transport is delegated to the SDK.
 */
export class ApexLspTestClient {
  private readonly core: ApexClientCore;
  private readonly initResult: InitializeResult | undefined;

  constructor(core: ApexClientCore, initResult?: InitializeResult) {
    this.core = core;
    this.initResult = initResult;
  }

  // --- Convenience methods not in SDK ---

  /**
   * Open a text document on the server via `textDocument/didOpen`.
   */
  openTextDocument(
    uri: string,
    text: string,
    languageId: string = 'apex',
  ): void {
    this.core.notify('textDocument/didOpen', {
      textDocument: { uri, languageId, version: 1, text },
    });
  }

  /**
   * Update a text document via `textDocument/didChange`.
   */
  updateTextDocument(uri: string, text: string, version: number): void {
    this.core.notify('textDocument/didChange', {
      textDocument: { uri, version },
      contentChanges: [{ text }],
    });
  }

  /**
   * Close a text document via `textDocument/didClose`.
   */
  closeTextDocument(uri: string): void {
    this.core.notify('textDocument/didClose', {
      textDocument: { uri },
    });
  }

  /**
   * Functional health check: sends `$/ping` to verify server responsiveness.
   * Returns true if the server responds successfully, false otherwise.
   */
  async isHealthy(): Promise<boolean> {
    if (this.core.isDisposed()) {
      return false;
    }
    try {
      await this.core.ping();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Poll `isHealthy()` with exponential backoff until healthy or timeout.
   */
  async waitForHealthy(timeoutMs: number = 30_000): Promise<void> {
    const startTime = Date.now();
    let delay = 100;

    while (Date.now() - startTime < timeoutMs) {
      if (await this.isHealthy()) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.min(delay * 2, 2000);
    }

    throw new Error(`Server did not become healthy within ${timeoutMs}ms`);
  }

  /**
   * Return the server capabilities captured during `initialize`.
   */
  getServerCapabilities(): InitializeResult['capabilities'] | undefined {
    return this.initResult?.capabilities;
  }

  // --- Typed LSP delegates ---

  hover(params: HoverParams): Promise<Hover | null> {
    return this.core.hover(params);
  }

  completion(
    params: CompletionParams,
  ): Promise<CompletionList | CompletionItem[] | null> {
    return this.core.completion(params);
  }

  definition(
    params: DefinitionParams,
  ): Promise<Definition | LocationLink[] | null> {
    return this.core.definition(params);
  }

  documentSymbol(
    params: DocumentSymbolParams,
  ): Promise<DocumentSymbol[] | SymbolInformation[] | null> {
    return this.core.documentSymbol(params);
  }

  // --- Generic RPC delegates ---

  request<R>(method: string, params?: unknown): Promise<R> {
    return this.core.request<R>(method, params);
  }

  notify(method: string, params?: unknown): void {
    this.core.notify(method, params);
  }

  /**
   * Alias for `request` that matches the old `ApexJsonRpcClient.sendRequest`.
   */
  sendRequest<T>(method: string, params?: unknown): Promise<T> {
    return this.core.request<T>(method, params);
  }

  /**
   * Alias for `notify` that matches the old `ApexJsonRpcClient.sendNotification`.
   */
  sendNotification(method: string, params?: unknown): void {
    this.core.notify(method, params);
  }

  // --- Middleware ---

  use(mw: ApexClientMiddleware): Disposable {
    return this.core.use(mw);
  }

  // --- Lifecycle ---

  isDisposed(): boolean {
    return this.core.isDisposed();
  }

  async dispose(): Promise<void> {
    await this.core.dispose();
  }

  /**
   * Access the underlying `ApexClientCore` for advanced usage.
   */
  getCore(): ApexClientCore {
    return this.core;
  }
}
