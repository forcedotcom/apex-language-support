/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ApexLibConfig, LanguageServerClient } from './types';
import { ApexLibManagerImpl } from './manager';

/**
 * Interface for the ApexLib manager
 */
export interface ApexLibManager {
  /** Protocol handler for LSP operations */
  protocolHandler: any;
  /** Document support for file operations */
  documentSupport: any;
  /** Configuration for ApexLib */
  config: ApexLibConfig;
  /** Initialize the system in the given editor context */
  initialize(editorContext: any): Promise<void>;
}

/**
 * Creates a new ApexLib manager
 * @param client The language server client
 * @param languageId The language identifier
 * @param customScheme The custom URI scheme
 * @param fileExtension The file extension
 * @returns A new ApexLibManager instance
 */
export function createApexLibManager(
  client: LanguageServerClient,
  languageId: string = 'apex',
  customScheme: string = 'apexlib',
  fileExtension: string = 'cls',
): ApexLibManager {
  const { createLanguageConfig } = require('./document-support');
  const config = createLanguageConfig(languageId, customScheme, fileExtension);

  return new ApexLibManagerImpl(client, config);
}

// Export types
export * from './types';
export * from './document-support';
export * from './protocol-handler';
