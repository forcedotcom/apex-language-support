/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { TextDocument } from 'vscode-languageserver-textdocument';
import {
  Connection,
  TextDocumentChangeEvent,
  DidOpenTextDocumentParams,
  DidChangeTextDocumentParams,
  DidCloseTextDocumentParams,
  DidSaveTextDocumentParams,
} from './lsp-types';

/**
 * Web-compatible TextDocuments manager
 * This provides document management without Node.js dependencies
 */
export class WebTextDocuments {
  private documents: Map<string, TextDocument> = new Map();
  private openHandlers: ((
    event: TextDocumentChangeEvent<TextDocument>,
  ) => void)[] = [];
  private changeHandlers: ((
    event: TextDocumentChangeEvent<TextDocument>,
  ) => void)[] = [];
  private closeHandlers: ((
    event: TextDocumentChangeEvent<TextDocument>,
  ) => void)[] = [];
  private saveHandlers: ((
    event: TextDocumentChangeEvent<TextDocument>,
  ) => void)[] = [];

  constructor(private textDocumentFactory: typeof TextDocument) {}

  /**
   * Get a document by URI
   */
  get(uri: string): TextDocument | undefined {
    return this.documents.get(uri);
  }

  /**
   * Get all documents
   */
  all(): TextDocument[] {
    return Array.from(this.documents.values());
  }

  /**
   * Get all document URIs
   */
  keys(): string[] {
    return Array.from(this.documents.keys());
  }

  /**
   * Listen to the connection for document events
   */
  listen(connection: Connection): void {
    connection.onRequest(
      'textDocument/didOpen',
      (params: DidOpenTextDocumentParams) => {
        const document = this.textDocumentFactory.create(
          params.textDocument.uri,
          params.textDocument.languageId,
          params.textDocument.version,
          params.textDocument.text,
        );
        this.documents.set(params.textDocument.uri, document);

        const event: TextDocumentChangeEvent<TextDocument> = { document };
        this.openHandlers.forEach((handler) => handler(event));
      },
    );

    connection.onRequest(
      'textDocument/didChange',
      (params: DidChangeTextDocumentParams) => {
        const document = this.documents.get(params.textDocument.uri);
        if (document) {
          this.textDocumentFactory.update(
            document,
            params.contentChanges,
            params.textDocument.version,
          );
          const event: TextDocumentChangeEvent<TextDocument> = { document };
          this.changeHandlers.forEach((handler) => handler(event));
        }
      },
    );

    connection.onRequest(
      'textDocument/didClose',
      (params: DidCloseTextDocumentParams) => {
        const document = this.documents.get(params.textDocument.uri);
        if (document) {
          this.documents.delete(params.textDocument.uri);
          const event: TextDocumentChangeEvent<TextDocument> = { document };
          this.closeHandlers.forEach((handler) => handler(event));
        }
      },
    );

    connection.onRequest(
      'textDocument/didSave',
      (params: DidSaveTextDocumentParams) => {
        const document = this.documents.get(params.textDocument.uri);
        if (document) {
          const event: TextDocumentChangeEvent<TextDocument> = { document };
          this.saveHandlers.forEach((handler) => handler(event));
        }
      },
    );
  }

  /**
   * Register handlers for document events
   */
  onDidOpen(
    handler: (event: TextDocumentChangeEvent<TextDocument>) => void,
  ): void {
    this.openHandlers.push(handler);
  }

  onDidChangeContent(
    handler: (event: TextDocumentChangeEvent<TextDocument>) => void,
  ): void {
    this.changeHandlers.push(handler);
  }

  onDidClose(
    handler: (event: TextDocumentChangeEvent<TextDocument>) => void,
  ): void {
    this.closeHandlers.push(handler);
  }

  onDidSave(
    handler: (event: TextDocumentChangeEvent<TextDocument>) => void,
  ): void {
    this.saveHandlers.push(handler);
  }
}
