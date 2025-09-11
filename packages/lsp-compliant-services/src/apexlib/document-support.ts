/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { DocumentSelector } from 'vscode-languageserver-protocol';
import type { EditorContext, ApexLibConfig } from './types';

/**
 * Manages document support for ApexLib custom URI scheme
 * Handles document selectors and file watching
 */
export class ApexLibDocumentSupport {
  constructor(private config: ApexLibConfig) {}

  /**
   * Get document selectors for LSP configuration
   * @returns Array of document selectors
   */
  getDocumentSelectors(): DocumentSelector {
    return [
      { scheme: 'file', language: 'apex' },
      { scheme: this.config.customScheme, language: 'apex' },
    ];
  }

  /**
   * Get VS Code specific document selectors
   * @returns Array of VS Code document selectors
   */
  getVSCodeDocumentSelectors(): any[] {
    return this.getDocumentSelectors() as any[];
  }

  /**
   * Get synchronization configuration for LSP
   * @returns Synchronization configuration object
   */
  getSynchronizationConfig() {
    return {
      fileEvents: `**/*.${this.config.fileExtension}`,
    };
  }

  /**
   * Create file system watcher for the editor context
   * @param editorContext The editor context to create watchers in
   * @returns File system watcher instance
   */
  createFileWatcher(editorContext: EditorContext) {
    return editorContext.createFileSystemWatcher(
      `**/*.${this.config.fileExtension}`,
    );
  }

  /**
   * Get the custom scheme being used
   * @returns The custom URI scheme
   */
  getCustomScheme(): string {
    return this.config.customScheme;
  }

  /**
   * Get the file extension being watched
   * @returns The file extension
   */
  getFileExtension(): string {
    return this.config.fileExtension;
  }

  /**
   * Get the language ID being used
   * @returns The language ID
   */
  getLanguageId(): string {
    return this.config.languageId;
  }
}
