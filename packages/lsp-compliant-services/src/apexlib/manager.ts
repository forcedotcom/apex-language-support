/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type {
  TextDocumentContentProvider,
  LanguageServerClient,
  EditorContext,
  ApexLibConfig,
  ApexLibManager,
} from './types';
import { ApexLibDocumentSupport } from './document-support';
import { ApexLibProtocolHandler } from './protocol-handler';

/**
 * Manager that orchestrates all components of the ApexLib custom URI protocol handler
 * This class is platform-agnostic and can be used in any environment
 */
export class ApexLibManagerImpl implements ApexLibManager {
  public readonly protocolHandler: TextDocumentContentProvider;
  public readonly documentSupport: ApexLibDocumentSupport;
  public readonly config: ApexLibConfig;

  constructor(
    languageServerClient: LanguageServerClient,
    config: ApexLibConfig,
  ) {
    this.config = config;
    this.documentSupport = new ApexLibDocumentSupport(config);
    this.protocolHandler = new ApexLibProtocolHandler(
      languageServerClient,
      config,
    );
  }

  /**
   * Initialize the ApexLib system in the given editor context
   * @param editorContext The editor context to initialize in
   */
  async initialize(editorContext: EditorContext): Promise<void> {
    // Register the protocol handler
    editorContext.registerTextDocumentContentProvider(
      this.config.customScheme,
      this.protocolHandler,
    );

    // Create file watcher for synchronization
    this.documentSupport.createFileWatcher(editorContext);
  }

  /**
   * Get the document selectors for LSP configuration
   * @returns Array of document selectors
   */
  getDocumentSelectors() {
    return this.documentSupport.getDocumentSelectors();
  }

  /**
   * Get the synchronization configuration for LSP
   * @returns Synchronization configuration object
   */
  getSynchronizationConfig() {
    return this.documentSupport.getSynchronizationConfig();
  }
}

/**
 * Create a default ApexLib manager
 * @param languageServerClient The language server client to use
 * @param languageId The language ID (defaults to 'apex')
 * @param customScheme The custom URI scheme (defaults to 'apexlib')
 * @param fileExtension The file extension (defaults to 'cls')
 * @returns An ApexLib manager instance
 */
export function createApexLibManager(
  languageServerClient: LanguageServerClient,
  languageId: string = 'apex',
  customScheme: string = 'apexlib',
  fileExtension: string = 'cls',
): ApexLibManager {
  const config = {
    customScheme,
    languageId,
    fileExtension,
    documentSelectors: [
      { scheme: 'file', language: languageId },
      { scheme: customScheme, language: languageId },
    ],
  };
  return new ApexLibManagerImpl(languageServerClient, config);
}

/**
 * Create an ApexLib manager with custom configuration
 * @param languageServerClient The language server client to use
 * @param config The custom configuration to use
 * @returns An ApexLib manager instance
 */
export function createApexLibManagerWithConfig(
  languageServerClient: LanguageServerClient,
  config: ApexLibConfig,
): ApexLibManager {
  return new ApexLibManagerImpl(languageServerClient, config);
}
