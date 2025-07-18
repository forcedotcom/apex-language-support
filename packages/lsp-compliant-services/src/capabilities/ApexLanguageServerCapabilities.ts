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
  production: ExtendedServerCapabilities;

  /** Development mode capabilities - full feature set */
  development: ExtendedServerCapabilities;
}

export interface ImplcitCapabilties {
  publishDiagnostics: boolean;
}

export type ExtendedServerCapabilities = ServerCapabilities & ImplcitCapabilties;

/**
 * Production capabilities - exposes which features are available in production
 * Only includes released features for stability
 */
export const PRODUCTION_CAPABILITIES: ExtendedServerCapabilities = {
  publishDiagnostics: false,
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
    identifier: 'apex-ls-ts',
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
export const DEVELOPMENT_CAPABILITIES: ExtendedServerCapabilities = {
  ...PRODUCTION_CAPABILITIES,
  publishDiagnostics: true,
  completionProvider: {
    resolveProvider: false,
    triggerCharacters: ['.'],
  },
  diagnosticProvider: {
    identifier: 'apex-ls-ts',
    interFileDependencies: true,
    workspaceDiagnostics: true,
  },
};

/**
 * Complete capability configuration for all modes
 */
export const CAPABILITIES_CONFIGURATION: CapabilitiesConfiguration = {
  production: PRODUCTION_CAPABILITIES,
  development: DEVELOPMENT_CAPABILITIES,
};
