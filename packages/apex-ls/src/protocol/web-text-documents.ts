/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  Connection,
  TextDocumentChangeEvent,
  DidOpenTextDocumentParams,
  DidChangeTextDocumentParams,
  DidCloseTextDocumentParams,
  DidSaveTextDocumentParams,
  Position,
} from './lsp-types';

/**
 * Web-compatible TextDocument implementation
 * This provides the same interface as vscode-languageserver-textdocument but without Node.js dependencies
 */
export class WebTextDocument {
  public readonly uri: string;
  public readonly languageId: string;
  public readonly version: number;
  private _text: string;

  constructor(uri: string, languageId: string, version: number, text: string) {
    this.uri = uri;
    this.languageId = languageId;
    this.version = version;
    this._text = text;
  }

  getText(): string {
    return this._text;
  }

  positionAt(offset: number): Position {
    const lines = this._text.split('\n');
    let line = 0;
    let character = 0;
    let currentOffset = 0;

    for (let i = 0; i < lines.length; i++) {
      const lineLength = lines[i].length + 1; // +1 for newline
      if (currentOffset + lineLength > offset) {
        line = i;
        character = offset - currentOffset;
        break;
      }
      currentOffset += lineLength;
    }

    return { line, character };
  }

  offsetAt(position: Position): number {
    const lines = this._text.split('\n');
    let offset = 0;

    for (let i = 0; i < position.line && i < lines.length; i++) {
      offset += lines[i].length + 1; // +1 for newline
    }

    offset += Math.min(position.character, lines[position.line]?.length || 0);
    return offset;
  }

  get lineCount(): number {
    return this._text.split('\n').length;
  }

  update(changes: any[], version: number): void {
    this._text = this.applyChanges(changes);
    (this as any).version = version;
  }

  private applyChanges(changes: any[]): string {
    let text = this._text;

    for (const change of changes) {
      if (change.range) {
        const start = this.offsetAt(change.range.start);
        const end = this.offsetAt(change.range.end);
        text = text.substring(0, start) + change.text + text.substring(end);
      } else {
        text = change.text;
      }
    }

    return text;
  }

  static create(
    uri: string,
    languageId: string,
    version: number,
    text: string,
  ): WebTextDocument {
    return new WebTextDocument(uri, languageId, version, text);
  }

  static update(
    document: WebTextDocument,
    changes: any[],
    version: number,
  ): void {
    document.update(changes, version);
  }
}

/**
 * Web-compatible TextDocuments manager
 * This provides document management without Node.js dependencies
 */
export class WebTextDocuments {
  private documents: Map<string, WebTextDocument> = new Map();
  private openHandlers: ((
    event: TextDocumentChangeEvent<WebTextDocument>,
  ) => void)[] = [];
  private changeHandlers: ((
    event: TextDocumentChangeEvent<WebTextDocument>,
  ) => void)[] = [];
  private closeHandlers: ((
    event: TextDocumentChangeEvent<WebTextDocument>,
  ) => void)[] = [];
  private saveHandlers: ((
    event: TextDocumentChangeEvent<WebTextDocument>,
  ) => void)[] = [];

  constructor(private textDocumentFactory: typeof WebTextDocument) {}

  /**
   * Get a document by URI
   */
  get(uri: string): WebTextDocument | undefined {
    return this.documents.get(uri);
  }

  /**
   * Get all documents
   */
  all(): WebTextDocument[] {
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

        const event: TextDocumentChangeEvent<WebTextDocument> = { document };
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
          const event: TextDocumentChangeEvent<WebTextDocument> = { document };
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
          const event: TextDocumentChangeEvent<WebTextDocument> = { document };
          this.closeHandlers.forEach((handler) => handler(event));
        }
      },
    );

    connection.onRequest(
      'textDocument/didSave',
      (params: DidSaveTextDocumentParams) => {
        const document = this.documents.get(params.textDocument.uri);
        if (document) {
          const event: TextDocumentChangeEvent<WebTextDocument> = { document };
          this.saveHandlers.forEach((handler) => handler(event));
        }
      },
    );
  }

  /**
   * Register handlers for document events
   */
  onDidOpen(
    handler: (event: TextDocumentChangeEvent<WebTextDocument>) => void,
  ): void {
    this.openHandlers.push(handler);
  }

  onDidChangeContent(
    handler: (event: TextDocumentChangeEvent<WebTextDocument>) => void,
  ): void {
    this.changeHandlers.push(handler);
  }

  onDidClose(
    handler: (event: TextDocumentChangeEvent<WebTextDocument>) => void,
  ): void {
    this.closeHandlers.push(handler);
  }

  onDidSave(
    handler: (event: TextDocumentChangeEvent<WebTextDocument>) => void,
  ): void {
    this.saveHandlers.push(handler);
  }
}
