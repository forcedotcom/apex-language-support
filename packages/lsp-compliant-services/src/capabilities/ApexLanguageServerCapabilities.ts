/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ServerCapabilities } from 'vscode-languageserver-protocol';

/**
 * Configuration for different server modes
 */
export interface CapabilitiesConfiguration {
  /** Production mode capabilities - optimized for performance */
  production: ServerCapabilities;

  /** Development mode capabilities - full feature set */
  development: ServerCapabilities;

  /** Test mode capabilities - testing-specific features */
  test: ServerCapabilities;
}

/**
 * Production capabilities - exposes which features are available in production
 * Only includes released features for stability
 */
export const PRODUCTION_CAPABILITIES: ServerCapabilities = {
  textDocumentSync: {
    openClose: true,
    change: 1,
    save: true,
    willSave: false,
    willSaveWaitUntil: false,
  },
  // Released features only
  documentSymbolProvider: true,
  foldingRangeProvider: true,
  diagnosticProvider: {
    interFileDependencies: false,
    workspaceDiagnostics: false,
  },
  workspace: {
    workspaceFolders: {
      supported: true,
      changeNotifications: true,
    },
  },
  // Planned features - explicitly not supported yet (implementation planned)
  completionProvider: undefined,
  hoverProvider: undefined,
  definitionProvider: undefined,
  referencesProvider: undefined,
  codeActionProvider: undefined,
  renameProvider: undefined,

  // Not supported features - not planned for implementation
  signatureHelpProvider: undefined,
  declarationProvider: undefined,
  typeDefinitionProvider: undefined,
  implementationProvider: undefined,
  documentHighlightProvider: undefined,
  codeLensProvider: undefined,
  documentLinkProvider: undefined,
  colorProvider: undefined,
  workspaceSymbolProvider: undefined,
  documentFormattingProvider: undefined,
  documentRangeFormattingProvider: undefined,
  documentOnTypeFormattingProvider: undefined,
  selectionRangeProvider: undefined,
  executeCommandProvider: undefined,
  callHierarchyProvider: undefined,
  linkedEditingRangeProvider: undefined,
  semanticTokensProvider: undefined,
  monikerProvider: undefined,
  typeHierarchyProvider: undefined,
  inlineValueProvider: undefined,
  inlayHintProvider: undefined,
  inlineCompletionProvider: undefined,
};

/**
 * Development capabilities - exposes which features are available in development
 * Includes both released and implemented features for testing
 */
export const DEVELOPMENT_CAPABILITIES: ServerCapabilities = {
  ...PRODUCTION_CAPABILITIES, // Start with production capabilities
  // Implemented features (including placeholders)
  completionProvider: {
    resolveProvider: false,
    triggerCharacters: ['.'],
  },
};

/**
 * Test capabilities - exposes which features are available in test
 * Inherits from development but with simplified settings for testing
 */
export const TEST_CAPABILITIES: ServerCapabilities = {
  ...DEVELOPMENT_CAPABILITIES, // Start with development capabilities
  textDocumentSync: {
    openClose: true,
    change: 1,
    save: true,
    willSave: false,
    willSaveWaitUntil: false,
  },
  // Simplified diagnostic capabilities for testing
  diagnosticProvider: {
    interFileDependencies: false,
    workspaceDiagnostics: false,
  },
  workspace: {
    workspaceFolders: {
      supported: true,
      changeNotifications: true,
    },
  },
};

/**
 * Complete capability configuration for all modes
 */
export const CAPABILITIES_CONFIGURATION: CapabilitiesConfiguration = {
  production: PRODUCTION_CAPABILITIES,
  development: DEVELOPMENT_CAPABILITIES,
  test: TEST_CAPABILITIES,
};
