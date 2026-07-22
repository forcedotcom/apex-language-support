/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { RpcConnection } from '@salesforce/apex-lsp-client';
import type { Disposable } from '@salesforce/apex-lsp-shared';

/**
 * In-memory `RpcConnection` implementation for demo/test mode.
 *
 * Replaces `MockApexJsonRpcClient` by providing a mock transport that
 * `ApexClientCore.create(mockConn)` can consume directly. Handles mock
 * responses for common LSP methods and maintains an in-memory document store.
 */
export class MockRpcConnection implements RpcConnection {
  private listening = false;
  private documentContents = new Map<string, string>();
  private requestHandlers = new Map<string, (params: unknown) => unknown>();
  private notificationHandlers = new Map<string, (params: unknown) => void>();

  // --- RpcConnection implementation ---

  sendRequest<R>(method: string, params?: unknown): Promise<R> {
    switch (method) {
      case 'initialize':
        return Promise.resolve(this.mockInitialize() as R);
      case 'shutdown':
        return Promise.resolve(undefined as R);
      case 'textDocument/hover':
        return Promise.resolve(this.mockHover() as R);
      case 'textDocument/completion':
        return Promise.resolve(this.mockCompletion() as R);
      case 'textDocument/documentSymbol':
        return Promise.resolve(this.mockDocumentSymbol() as R);
      case 'textDocument/formatting':
        return Promise.resolve(
          this.mockFormatting(params as Record<string, unknown>) as R,
        );
      default:
        return Promise.resolve({} as R);
    }
  }

  sendNotification(method: string, params?: unknown): void {
    const p = params as Record<string, unknown> | undefined;

    switch (method) {
      case 'textDocument/didOpen': {
        const doc = (p as { textDocument: { uri: string; text: string } })
          ?.textDocument;
        if (doc) {
          this.documentContents.set(doc.uri, doc.text);
        }
        break;
      }
      case 'textDocument/didChange': {
        const change = p as {
          textDocument: { uri: string };
          contentChanges: Array<{ text: string }>;
        };
        if (change?.textDocument && change.contentChanges?.[0]) {
          this.documentContents.set(
            change.textDocument.uri,
            change.contentChanges[0].text,
          );
        }
        break;
      }
      case 'textDocument/didClose': {
        const close = p as { textDocument: { uri: string } };
        if (close?.textDocument) {
          this.documentContents.delete(close.textDocument.uri);
        }
        break;
      }
      default:
        break;
    }
  }

  onRequest(method: string, handler: (params: unknown) => unknown): Disposable {
    this.requestHandlers.set(method, handler);
    return {
      dispose: () => {
        this.requestHandlers.delete(method);
      },
    };
  }

  onNotification(
    method: string,
    handler: (params: unknown) => void,
  ): Disposable {
    this.notificationHandlers.set(method, handler);
    return {
      dispose: () => {
        this.notificationHandlers.delete(method);
      },
    };
  }

  onError(_handler: (e: Error) => void): Disposable {
    return { dispose: () => {} };
  }

  onClose(_handler: () => void): Disposable {
    return { dispose: () => {} };
  }

  dispose(): void {
    this.listening = false;
    this.documentContents.clear();
    this.requestHandlers.clear();
    this.notificationHandlers.clear();
  }

  isListening(): boolean {
    return this.listening;
  }

  /**
   * Start "listening" - must be called AFTER `ApexClientCore.create()`.
   */
  listen(): void {
    this.listening = true;
  }

  // --- Mock responses ---

  private mockInitialize(): unknown {
    return {
      capabilities: {
        textDocumentSync: {
          openClose: true,
          change: 1,
        },
        completionProvider: {
          resolveProvider: false,
          triggerCharacters: ['.'],
        },
        hoverProvider: true,
        documentSymbolProvider: true,
        documentFormattingProvider: true,
      },
    };
  }

  private mockHover(): unknown {
    return {
      contents: {
        kind: 'markdown',
        value: [
          '**Apex Demo Server**',
          '',
          'This is a hover information example from the mock client.',
          '',
          '```apex',
          'public String getGreeting() {',
          '    return "Hello from Apex Mock Client!";',
          '}',
          '```',
        ].join('\n'),
      },
    };
  }

  private mockCompletion(): unknown {
    return [
      {
        label: 'getName',
        kind: 2,
        detail: 'String getName()',
        documentation: 'Gets the name of the instance.',
      },
      {
        label: 'setName',
        kind: 2,
        detail: 'void setName(String name)',
        documentation: 'Sets the name of the instance.',
      },
      {
        label: 'count',
        kind: 7,
        detail: 'Integer',
        documentation: 'The count property.',
      },
      {
        label: 'isActive',
        kind: 7,
        detail: 'Boolean',
        documentation: 'Indicates if the instance is active.',
      },
    ];
  }

  private mockDocumentSymbol(): unknown {
    return [
      {
        name: 'TestClass',
        kind: 5,
        range: {
          start: { line: 1, character: 0 },
          end: { line: 12, character: 1 },
        },
        selectionRange: {
          start: { line: 1, character: 0 },
          end: { line: 1, character: 18 },
        },
        children: [
          {
            name: 'name',
            kind: 8,
            range: {
              start: { line: 2, character: 4 },
              end: { line: 2, character: 24 },
            },
            selectionRange: {
              start: { line: 2, character: 12 },
              end: { line: 2, character: 16 },
            },
          },
          {
            name: 'TestClass',
            kind: 9,
            range: {
              start: { line: 4, character: 4 },
              end: { line: 6, character: 5 },
            },
            selectionRange: {
              start: { line: 4, character: 4 },
              end: { line: 4, character: 13 },
            },
          },
          {
            name: 'getName',
            kind: 6,
            range: {
              start: { line: 8, character: 4 },
              end: { line: 10, character: 5 },
            },
            selectionRange: {
              start: { line: 8, character: 4 },
              end: { line: 8, character: 11 },
            },
          },
        ],
      },
    ];
  }

  private mockFormatting(params: Record<string, unknown>): unknown {
    const textDoc = params?.textDocument as { uri: string } | undefined;
    const content = textDoc
      ? this.documentContents.get(textDoc.uri)
      : undefined;
    if (!content) {
      return [];
    }

    return [
      {
        range: {
          start: { line: 0, character: 0 },
          end: { line: 999, character: 999 },
        },
        newText: content
          .split('\n')
          .map((line) => line.trim())
          .join('\n')
          .replace(/\{/g, ' {')
          .replace(/;/g, ';\n')
          .replace(/\}/g, '}\n')
          .replace(/\s*\n\s*/g, '\n'),
      },
    ];
  }
}
