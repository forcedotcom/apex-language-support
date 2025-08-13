/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  Connection,
  InitializeParams,
  InitializeResult,
  InitializedParams,
  DocumentSymbolParams,
  SymbolInformation,
  DocumentSymbol,
  FoldingRangeParams,
  FoldingRange,
  Diagnostic,
} from './lsp-types';

/**
 * Web-compatible LSP connection implementation
 * This provides a minimal connection that works in web workers
 * without any Node.js dependencies.
 */
export class WebConnection implements Connection {
  private handlers: Map<string, Function> = new Map();
  private initializeHandler?: (
    params: InitializeParams,
  ) => InitializeResult | Promise<InitializeResult>;
  private initializedHandler?: (params: InitializedParams) => void;
  private documentSymbolHandler?: (
    params: DocumentSymbolParams,
  ) =>
    | (SymbolInformation | DocumentSymbol)[]
    | null
    | Promise<(SymbolInformation | DocumentSymbol)[] | null>;
  private foldingRangeHandler?: (
    params: FoldingRangeParams,
  ) => FoldingRange[] | null | Promise<FoldingRange[] | null>;
  private completionHandler?: (params: any) => any;
  private hoverHandler?: (params: any) => any;
  private shutdownHandler?: () => void;
  private exitHandler?: () => void;

  constructor() {
    // Set up message handling
    this.setupMessageHandling();
  }

  private setupMessageHandling(): void {
    // Listen for messages from the main thread
    self.addEventListener('message', async (event) => {
      const message = event.data;

      try {
        if (message.method) {
          await this.handleRequest(message);
        }
      } catch (error) {
        console.error('Error handling message:', error);
        this.sendErrorResponse(message.id, error);
      }
    });
  }

  private async handleRequest(message: any): Promise<void> {
    const { method, params, id } = message;

    switch (method) {
      case 'initialize':
        if (this.initializeHandler) {
          const result = await this.initializeHandler(params);
          this.sendResponse(id, result);
        }
        break;

      case 'initialized':
        if (this.initializedHandler) {
          this.initializedHandler(params);
        }
        break;

      case 'textDocument/documentSymbol':
        if (this.documentSymbolHandler) {
          const result = await this.documentSymbolHandler(params);
          this.sendResponse(id, result);
        }
        break;

      case 'textDocument/foldingRange':
        if (this.foldingRangeHandler) {
          const result = await this.foldingRangeHandler(params);
          this.sendResponse(id, result);
        }
        break;

      case 'shutdown':
        if (this.shutdownHandler) {
          this.shutdownHandler();
        }
        this.sendResponse(id, null);
        break;

      case 'exit':
        if (this.exitHandler) {
          this.exitHandler();
        }
        break;

      default:
        // Check for custom handlers
        const handler = this.handlers.get(method);
        if (handler) {
          const result = await handler(params);
          this.sendResponse(id, result);
        } else {
          console.warn(`No handler for method: ${method}`);
          this.sendErrorResponse(id, new Error(`Method not found: ${method}`));
        }
        break;
    }
  }

  private sendResponse(id: string | number, result: any): void {
    self.postMessage({
      jsonrpc: '2.0',
      id,
      result,
    });
  }

  private sendErrorResponse(id: string | number, error: any): void {
    self.postMessage({
      jsonrpc: '2.0',
      id,
      error: {
        code: -32603,
        message: error.message || 'Internal error',
      },
    });
  }

  // Connection interface implementation
  onInitialize(
    handler: (
      params: InitializeParams,
    ) => InitializeResult | Promise<InitializeResult>,
  ): void {
    this.initializeHandler = handler;
  }

  onInitialized(handler: (params: InitializedParams) => void): void {
    this.initializedHandler = handler;
  }

  onDocumentSymbol(
    handler: (
      params: DocumentSymbolParams,
    ) =>
      | (SymbolInformation | DocumentSymbol)[]
      | null
      | Promise<(SymbolInformation | DocumentSymbol)[] | null>,
  ): void {
    this.documentSymbolHandler = handler;
  }

  onFoldingRanges(
    handler: (
      params: FoldingRangeParams,
    ) => FoldingRange[] | null | Promise<FoldingRange[] | null>,
  ): void {
    this.foldingRangeHandler = handler;
  }

  onCompletion(handler: (params: any) => any): void {
    this.completionHandler = handler;
  }

  onHover(handler: (params: any) => any): void {
    this.hoverHandler = handler;
  }

  onRequest(method: string, handler: (params: any) => any): void {
    this.handlers.set(method, handler);
  }

  onNotification(method: string, handler: (params: any) => void): void {
    this.handlers.set(method, handler);
  }

  sendRequest(method: string, params?: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const id = Math.random().toString(36);
      self.postMessage({
        jsonrpc: '2.0',
        id,
        method,
        params,
      });
      // Note: In a real implementation, you'd wait for the response
      resolve(null);
    });
  }

  sendProgress(type: any, token: any, value: any): void {
    // Stub implementation
  }

  onProgress(type: any, token: any, handler: (params: any) => void): void {
    // Stub implementation
  }

  onShutdown(handler: () => void): void {
    this.shutdownHandler = handler;
  }

  onExit(handler: () => void): void {
    this.exitHandler = handler;
  }

  sendNotification(method: string, params?: any): void {
    self.postMessage({
      jsonrpc: '2.0',
      method,
      params,
    });
  }

  sendDiagnostics(params: { uri: string; diagnostics: Diagnostic[] }): void {
    this.sendNotification('textDocument/publishDiagnostics', params);
  }

  listen(): void {
    // Already listening via addEventListener in constructor
  }
}

/**
 * Create a web-compatible connection
 */
export function createWebConnection(): Connection {
  return new WebConnection();
}
