/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { DocumentSelector, DocumentFilter } from 'vscode-languageserver-protocol';

import { ApexLibConfig, EditorContext } from './types';

/**
 * Provides document support functionality for ApexLib
 */
export class ApexLibDocumentSupport {
  constructor(private config: ApexLibConfig) {}

  /**
   * Gets the document selectors for Apex documents
   * @returns Array of document selectors
   */
  getDocumentSelectors(): DocumentSelector {
    return this.config.documentSelectors;
  }

  /**
   * Gets the VS Code compatible document selectors
   * @returns Array of VS Code document selectors
   */
  getVSCodeDocumentSelectors(): any[] {
    return this.config.documentSelectors as any[];
  }

  /**
   * Gets the synchronization configuration for file events
   * @returns Object containing file event patterns
   */
  getSynchronizationConfig() {
    return {
      fileEvents: `**/*.${this.config.fileExtension}`,
    };
  }

  /**
   * Creates a file system watcher for Apex documents
   * @param editorContext The editor context to use
   * @returns A file system watcher
   */
  createFileWatcher(editorContext: EditorContext) {
    return editorContext.createFileSystemWatcher(`**/*.${this.config.fileExtension}`);
  }
}

/**
 * Creates a new ApexLibDocumentSupport instance
 * @param config The configuration to use
 * @returns A new ApexLibDocumentSupport instance
 */
export function createDocumentSupport(config: ApexLibConfig): ApexLibDocumentSupport {
  return new ApexLibDocumentSupport(config);
}

/**
 * Creates a common language configuration
 * @param languageId The language identifier
 * @param customScheme The custom URI scheme
 * @param fileExtension The file extension
 * @returns A new ApexLibConfig instance
 */
export function createLanguageConfig(languageId: string, customScheme: string, fileExtension: string): ApexLibConfig {
  const fileFilter: DocumentFilter = { scheme: 'file', language: languageId };
  const customFilter: DocumentFilter = {
    scheme: customScheme,
    language: languageId,
  };

  return {
    customScheme,
    languageId,
    fileExtension,
    documentSelectors: [fileFilter, customFilter] as DocumentSelector,
  };
}
