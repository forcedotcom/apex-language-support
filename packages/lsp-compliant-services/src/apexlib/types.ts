/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { DocumentSelector } from 'vscode-languageserver-protocol';
import type { ApexLibDocumentSupport } from './document-support';

/**
 * Interface for text document content providers
 * Handles content resolution for custom URI schemes
 */
export interface TextDocumentContentProvider {
  /**
   * Provide text document content for a given URI
   * @param uri The URI to resolve content for
   * @returns Promise resolving to the document content
   */
  provideTextDocumentContent(uri: UriLike): Promise<string>;
}

/**
 * Interface for language server clients
 * Abstracts communication with language servers
 */
export interface LanguageServerClient {
  /**
   * Send a request to the language server
   * @param method The method name
   * @param params Optional parameters
   * @returns Promise resolving to the response
   */
  sendRequest<T = any>(method: string, params?: any): Promise<T>;

  /**
   * Send a notification to the language server
   * @param method The method name
   * @param params Optional parameters
   */
  sendNotification(method: string, params?: any): void;
}

/**
 * Interface for editor contexts
 * Abstracts editor-specific functionality
 */
export interface EditorContext {
  /**
   * Register a text document content provider
   * @param scheme The URI scheme to register for
   * @param provider The content provider to register
   * @returns Disposable for cleanup
   */
  registerTextDocumentContentProvider(
    scheme: string,
    provider: TextDocumentContentProvider,
  ): any;

  /**
   * Create a file system watcher
   * @param pattern The file pattern to watch
   * @returns File system watcher instance
   */
  createFileSystemWatcher(pattern: string): any;
}

/**
 * Interface for URI-like objects
 * Abstracts URI representation across different environments
 */
export interface UriLike {
  /**
   * Get the string representation of the URI
   * @returns The URI as a string
   */
  toString(): string;
}

/**
 * Configuration for ApexLib custom URI protocol handler
 */
export interface ApexLibConfig {
  /** The custom URI scheme (e.g., 'apexlib') */
  customScheme: string;
  /** The language ID (e.g., 'apex') */
  languageId: string;
  /** The file extension (e.g., 'cls') */
  fileExtension: string;
  /** Document selectors for LSP configuration */
  documentSelectors: DocumentSelector;
}

/**
 * Interface for ApexLib managers
 * Orchestrates all components of the custom URI protocol handler
 */
export interface ApexLibManager {
  /** The protocol handler for content resolution */
  protocolHandler: TextDocumentContentProvider;
  /** The document support for file management */
  documentSupport: ApexLibDocumentSupport;
  /** The configuration being used */
  config: ApexLibConfig;
  /** Initialize the system in the given editor context */
  initialize(editorContext: EditorContext): Promise<void>;
  /** Get document selectors for LSP configuration */
  getDocumentSelectors(): DocumentSelector;
  /** Get synchronization configuration for LSP */
  getSynchronizationConfig(): { fileEvents: string };
}
