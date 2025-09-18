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
import { getLogger } from '@salesforce/apex-lsp-shared';

/**
 * Handles protocol operations for ApexLib
 */
export class ApexLibProtocolHandler implements TextDocumentContentProvider {
  private logger = getLogger();

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
      this.logger.debug(() => `Resolving content for URI: ${uri}`);

      // First, try to resolve content directly from the parser package
      const directContent = await this.resolveContentDirectly(uri);
      if (directContent) {
        this.logger.debug(() => `Resolved content directly for: ${uri}`);
        this.notifyDocumentOpened(uri, directContent);
        return directContent;
      }

      // Fallback to LSP resolve request
      this.logger.debug(() => `Falling back to LSP resolve for: ${uri}`);
      const result = await this.client.sendRequest<{ content: string }>(
        `${this.config.customScheme}/resolve`,
        { uri },
      );

      // Notify the language server about the opened document
      this.notifyDocumentOpened(uri, result.content);

      return result.content;
    } catch (error) {
      this.logger.error(
        () =>
          `Failed to resolve ${this.config.customScheme} URI: ${uri} Error: ${error}`,
      );
      throw error;
    }
  }

  /**
   * Attempts to resolve content directly from the parser package
   * @param uri The URI to resolve
   * @returns Promise resolving to content or null if not found
   */
  private async resolveContentDirectly(uri: string): Promise<string | null> {
    try {
      // Check if this is an apexlib:// URI
      if (!uri.startsWith('apexlib://')) {
        return null;
      }

      // Extract the class name from the URI
      // Format: apexlib://System.cls -> System.cls
      const className = uri.replace('apexlib://', '');

      // Try to get content from the parser package's ResourceLoader
      // This would require the ResourceLoader to be accessible from the LSP package
      const content = await this.getContentFromResourceLoader(className);

      return content;
    } catch (error) {
      this.logger.debug(() => `Direct resolution failed for ${uri}: ${error}`);
      return null;
    }
  }

  /**
   * Get content from the parser package's ResourceLoader
   * @param className The class name to resolve
   * @returns Promise resolving to content or null if not found
   */
  private async getContentFromResourceLoader(
    className: string,
  ): Promise<string | null> {
    try {
      // Import the ResourceLoader from the parser package
      // This will be available when the package is properly linked
      const { ResourceLoader } = await import(
        '@salesforce/apex-lsp-parser-ast'
      );

      if (!ResourceLoader) {
        this.logger.debug(
          () => 'ResourceLoader not available from parser package',
        );
        return null;
      }

      // Get the singleton instance
      const resourceLoader = ResourceLoader.getInstance();

      // Try to get the content for the class
      // The ResourceLoader.getFile method expects paths like 'System/System.cls'
      // We need to construct the proper path from the class name
      let filePath = className;

      // If it's just a class name (e.g., 'System'), try common patterns
      if (!className.includes('/')) {
        // Try StandardApexLibrary/ClassName.cls first
        filePath = `StandardApexLibrary/${className}.cls`;
      }

      const content = await resourceLoader.getFile(filePath);

      if (content) {
        this.logger.debug(
          () => `Found embedded content for: ${className} at path: ${filePath}`,
        );
        return content;
      }

      // If the first attempt failed, try alternative paths
      if (!className.includes('/')) {
        // Try just the class name with .cls extension
        const altPath = `${className}.cls`;
        const altContent = await resourceLoader.getFile(altPath);

        if (altContent) {
          this.logger.debug(
            () =>
              `Found embedded content for: ${className} at alt path: ${altPath}`,
          );
          return altContent;
        }
      }

      this.logger.debug(() => `No embedded content found for: ${className}`);
      return null;
    } catch (error) {
      this.logger.debug(() => `Error accessing ResourceLoader: ${error}`);
      return null;
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
