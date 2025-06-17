/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ApexLibConfig, LanguageServerClient } from './types';
import { createProtocolHandler } from './protocol-handler';
import {
  createDocumentSupport,
  createLanguageConfig,
} from './document-support';

/**
 * Interface for the ApexLib manager
 */
export interface ApexLibManager {
  /** Protocol handler for LSP operations */
  protocolHandler: ReturnType<typeof createProtocolHandler>;
  /** Document support for file operations */
  documentSupport: ReturnType<typeof createDocumentSupport>;
  /** Configuration for ApexLib */
  config: ApexLibConfig;
}

/**
 * Creates a new ApexLib manager
 * @param languageId The language identifier
 * @param customScheme The custom URI scheme
 * @param fileExtension The file extension
 * @param client The language server client
 * @returns A new ApexLibManager instance
 */
export function createApexLibManager(
  languageId: string,
  customScheme: string,
  fileExtension: string,
  client: LanguageServerClient,
): ApexLibManager {
  const config = createLanguageConfig(languageId, customScheme, fileExtension);
  const protocolHandler = createProtocolHandler(client, config);
  const documentSupport = createDocumentSupport(config);

  return {
    protocolHandler,
    documentSupport,
    config,
  };
}

// Export types
export * from './types';
export * from './document-support';
export * from './protocol-handler';
