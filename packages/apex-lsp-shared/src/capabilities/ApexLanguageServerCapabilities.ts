/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  ServerCapabilities,
  ClientCapabilities,
} from 'vscode-languageserver-protocol';

export type ExtendedServerCapabilities = ServerCapabilities &
  ImplicitCapabilties & { experimental?: ExperimentalCapabilities };

// ============================================================================
// Platform Filtering - Disabled Capability Sets
// ============================================================================

/**
 * Capability keys that reference experimental capabilities.
 * Used to construct full paths like 'experimental.profilingProvider'.
 */
type ExperimentalCapabilityKey = keyof ExperimentalCapabilities;

/**
 * Standard LSP capability keys.
 */
type StandardCapabilityKey = keyof ServerCapabilities;

/**
 * All possible capability paths including nested experimental capabilities.
 * Format: 'experimental.<capability>' for experimental capabilities,
 * or standard capability name for top-level capabilities.
 * Includes ImplicitCapabilities keys (e.g. publishDiagnostics) not in ServerCapabilities.
 */
type CapabilityPath =
  | StandardCapabilityKey
  | keyof ImplicitCapabilties
  | `experimental.${ExperimentalCapabilityKey}`;

/**
 * Set of capabilities that are disabled in web environments.
 * These capabilities require Node.js APIs or desktop-only features.
 *
 * Capabilities listed here will be filtered out when the server runs in a web context.
 */
export const WEB_DISABLED_CAPABILITIES: ReadonlySet<CapabilityPath> = new Set([
  'experimental.profilingProvider', // Requires Node.js inspector API
  'publishDiagnostics', // TDX26: diagnostics disabled for web
  'diagnosticProvider', // TDX26: diagnostics disabled for web
]);

/**
 * Set of capabilities that are disabled in desktop environments.
 * Currently empty, but can be extended for web-only features.
 *
 * Capabilities listed here will be filtered out when the server runs in a desktop context.
 */
export const DESKTOP_DISABLED_CAPABILITIES: ReadonlySet<CapabilityPath> =
  new Set([
    // No desktop-disabled capabilities at this time
  ]);

/**
 * Configuration for different server modes
 */
export interface CapabilitiesConfiguration {
  /** Production mode capabilities - optimized for performance */
  production: ExtendedServerCapabilities;

  /** Development mode capabilities - full feature set */
  development: ExtendedServerCapabilities;
}

export interface ImplicitCapabilties {
  publishDiagnostics: boolean;
}

export interface FindMissingArtifactCapability {
  /** Whether the server/client supports finding missing artifacts */
  enabled: boolean;
  /** Supported resolution modes */
  supportedModes: ('blocking' | 'background')[];
  /** Maximum candidates to open per request */
  maxCandidatesToOpen?: number;
  /** Default timeout hint in milliseconds */
  timeoutMsHint?: number;
}

/**
 * Profiling capability configuration.
 * Profiling is only available in desktop environments (requires Node.js inspector API).
 */
export interface ProfilingCapability {
  /** Whether profiling handlers should be registered */
  enabled: boolean;
}

export interface ExperimentalCapabilities {
  /** Missing artifact resolution capability */
  findMissingArtifactProvider?: FindMissingArtifactCapability;
  /**
   * Profiling capability - desktop only.
   * Disabled for web platforms (see WEB_DISABLED_CAPABILITIES).
   */
  profilingProvider?: ProfilingCapability;
}

/**
 * Configuration for client capabilities in different server modes
 * Mirrors CapabilitiesConfiguration structure for the client side
 */
export interface ClientCapabilitiesConfiguration {
  /** Production mode client capabilities */
  production: ClientCapabilities;

  /** Development mode client capabilities */
  development: ClientCapabilities;
}

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
  hoverProvider: true,
  definitionProvider: true,
  codeLensProvider: {
    resolveProvider: false,
  },
  diagnosticProvider: undefined, // TDX26: production never gets diagnostics
  workspace: {
    workspaceFolders: {
      supported: true,
      changeNotifications: true,
    },
  },
  // Planned features - explicitly not supported yet (implementation planned)
  completionProvider: undefined,
  referencesProvider: true, // ENABLED: References implementation
  codeActionProvider: undefined,
  renameProvider: undefined,

  // Not supported features - not planned for implementation
  signatureHelpProvider: undefined,
  declarationProvider: undefined,
  typeDefinitionProvider: undefined,
  implementationProvider: undefined,
  documentHighlightProvider: undefined,
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
  experimental: {
    findMissingArtifactProvider: {
      enabled: true, // Enabled for production (hover, goto def, etc.)
      supportedModes: ['blocking', 'background'],
      maxCandidatesToOpen: 3,
      timeoutMsHint: 1500,
    },
    // Profiling is desktop-only (requires Node.js inspector API)
    // Filtered out for web via WEB_DISABLED_CAPABILITIES
    profilingProvider: {
      enabled: false, // Disabled by default in production
    },
  },
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
  foldingRangeProvider: true,
  hoverProvider: true,
  definitionProvider: true,
  implementationProvider: true,
  referencesProvider: true,
  codeLensProvider: {
    resolveProvider: false,
  },
  diagnosticProvider: {
    identifier: 'apex-ls-ts',
    interFileDependencies: true,
    workspaceDiagnostics: false,
  },
  executeCommandProvider: {
    commands: ['apex.findApexTests'],
  },
  experimental: {
    findMissingArtifactProvider: {
      enabled: true, // Enabled by default in development
      supportedModes: ['blocking', 'background'],
      maxCandidatesToOpen: 3,
      timeoutMsHint: 2000,
    },
    // Profiling is desktop-only (requires Node.js inspector API)
    // Filtered out for web via WEB_DISABLED_CAPABILITIES
    profilingProvider: {
      enabled: true, // Enabled by default in development
    },
  },
};

/**
 * Complete capability configuration for all modes
 */
export const CAPABILITIES_CONFIGURATION: CapabilitiesConfiguration = {
  production: PRODUCTION_CAPABILITIES,
  development: DEVELOPMENT_CAPABILITIES,
};
