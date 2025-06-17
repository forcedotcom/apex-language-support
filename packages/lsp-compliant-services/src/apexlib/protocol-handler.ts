/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { TextDocument } from 'vscode-languageserver-textdocument';

import {
  TextDocumentContentProvider,
  LanguageServerClient,
  ApexLibConfig,
} from './types';

/**
 * Handles protocol operations for ApexLib
 */
export class ApexLibProtocolHandler implements TextDocumentContentProvider {
  constructor(
    private client: LanguageServerClient,
    private config: ApexLibConfig,
  ) {}

  /**
   * Provides the content of a text document
   * @param uri The URI of the document
   * @returns A promise that resolves to the document content
   */
  async provideTextDocumentContent(uri: string): Promise<string> {
    try {
      // Request content resolution from the language server
      const result = await this.client.sendRequest<{ content: string }>(
        `${this.config.customScheme}/resolve`,
        { uri },
      );

      // Notify the language server about the opened document
      this.notifyDocumentOpened(uri, result.content);

      return result.content;
    } catch (error) {
      console.error(
        `Failed to resolve ${this.config.customScheme} URI: ${uri}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Notifies the language server that a document has been opened
   * @param uri The URI of the document
   * @param content The content of the document
   */
  private notifyDocumentOpened(uri: string, content: string): void {
    const textDocument: TextDocument = {
      uri,
      languageId: this.config.languageId,
      version: 1,
      getText: () => content,
      positionAt: () => ({ line: 0, character: 0 }),
      offsetAt: () => 0,
      lineCount: content.split('\n').length,
    };

    this.client.sendNotification('textDocument/didOpen', {
      textDocument,
    });
  }
}

/**
 * Creates a new ApexLibProtocolHandler instance
 * @param client The language server client to use
 * @param config The configuration to use
 * @returns A new ApexLibProtocolHandler instance
 */
export function createProtocolHandler(
  client: LanguageServerClient,
  config: ApexLibConfig,
): ApexLibProtocolHandler {
  return new ApexLibProtocolHandler(client, config);
}
