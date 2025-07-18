/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { DocumentSelector } from 'vscode-languageserver-protocol';

/**
 * Core interfaces for ApexLib that abstract away editor-specific implementations
 * and integrate with LSP protocol types.
 */

/**
 * Configuration for the ApexLib
 */
export interface ApexLibConfig {
  /** Custom URI scheme for Apex documents */
  customScheme: string;
  /** Language identifier for Apex documents */
  languageId: string;
  /** File extension for Apex documents */
  fileExtension: string;
  /** Document selectors for filtering Apex documents */
  documentSelectors: DocumentSelector;
}

/**
 * Interface for text document content providers
 */
export interface TextDocumentContentProvider {
  /**
   * Provides the content of a text document
   * @param uri The URI of the document
   * @returns A promise that resolves to the document content
   */
  provideTextDocumentContent(uri: string): Promise<string>;
}

/**
 * Interface for editor context operations
 */
export interface EditorContext {
  /**
   * Registers a text document content provider
   * @param scheme The URI scheme to register for
   * @param provider The content provider to register
   */
  registerTextDocumentContentProvider(
    scheme: string,
    provider: TextDocumentContentProvider,
  ): void;

  /**
   * Creates a file system watcher
   * @param pattern The glob pattern to watch
   */
  createFileSystemWatcher(pattern: string): void;
}

/**
 * Interface for language server client operations
 */
export interface LanguageServerClient {
  /**
   * Sends a request to the language server
   * @param method The request method
   * @param params Optional parameters for the request
   * @returns A promise that resolves to the response
   */
  sendRequest<T = any>(method: string, params?: any): Promise<T>;

  /**
   * Sends a notification to the language server
   * @param method The notification method
   * @param params Optional parameters for the notification
   */
  sendNotification(method: string, params?: any): void;
}
