/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Connection } from 'vscode-languageserver/node';
import { TextDocuments } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import {
  LanguageServerClient,
  EditorContext,
  TextDocumentContentProvider,
} from '@salesforce/lsp-compliant-services/apexlib';

/**
 * Node-specific implementation of LanguageServerClient
 */
export class NodeLanguageServerClient implements LanguageServerClient {
  constructor(private connection: Connection) {}

  sendRequest<T = any>(method: string, params?: any): Promise<T> {
    return this.connection.sendRequest(method, params);
  }

  sendNotification(method: string, params?: any): void {
    this.connection.sendNotification(method, params);
  }
}

/**
 * Node-specific implementation of EditorContext
 */
export class NodeEditorContext implements EditorContext {
  constructor(
    private connection: Connection,
    private documents: TextDocuments<TextDocument>,
  ) {}

  registerTextDocumentContentProvider(
    scheme: string,
    provider: TextDocumentContentProvider,
  ): void {
    // In Node.js, we don't need to register a content provider
    // as we handle document content through the TextDocuments instance
  }

  createFileSystemWatcher(pattern: string): void {
    // In Node.js, we don't need to create a file system watcher
    // as we handle file events through the TextDocuments instance
  }
}

/**
 * Creates a Node-specific ApexLib adapter
 * @param connection The LSP connection
 * @param documents The text documents instance
 * @returns An object containing the language server client and editor context
 */
export function createNodeApexLibAdapter(
  connection: Connection,
  documents: TextDocuments<TextDocument>,
) {
  return {
    client: new NodeLanguageServerClient(connection),
    editorContext: new NodeEditorContext(connection, documents),
  };
}
