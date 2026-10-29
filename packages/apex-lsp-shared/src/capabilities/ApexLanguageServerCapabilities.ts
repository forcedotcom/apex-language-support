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
  CodeActionKind,
  type SemanticTokensClientCapabilities,
  type SemanticTokensOptions,
} from 'vscode-languageserver-protocol';
import { APEX_DEBUGGER_COMMANDS } from '../commands/ApexDebuggerCommands';
import { SEMANTIC_TOKEN_LEGEND } from '../semanticTokenLegend';

const SEMANTIC_TOKENS_PROVIDER: SemanticTokensOptions = {
  legend: {
    tokenTypes: [...SEMANTIC_TOKEN_LEGEND.tokenTypes],
    tokenModifiers: [...SEMANTIC_TOKEN_LEGEND.tokenModifiers],
  },
  full: true,
};

/**
 * Restrict the server legend to token names a semantic-token-capable client
 * advertises. The server owns the response ordering and uses this exact legend
 * when encoding each token response for that client session.
 */
export function negotiateSemanticTokensProvider(
  serverProvider: SemanticTokensOptions,
  clientCapabilities: SemanticTokensClientCapabilities | undefined,
): SemanticTokensOptions | undefined {
  if (clientCapabilities === undefined) return serverProvider;
  if (
    (clientCapabilities.requests.full !== true &&
      typeof clientCapabilities.requests.full !== 'object') ||
    !clientCapabilities.formats.includes('relative')
  ) {
    return undefined;
  }

  const tokenTypes = new Set(clientCapabilities.tokenTypes);
  const tokenModifiers = new Set(clientCapabilities.tokenModifiers);
  return {
    legend: {
      tokenTypes: serverProvider.legend.tokenTypes.filter((type) =>
        tokenTypes.has(type),
      ),
      tokenModifiers: serverProvider.legend.tokenModifiers.filter((modifier) =>
        tokenModifiers.has(modifier),
      ),
    },
    full: serverProvider.full,
  };
}

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
  // publishDiagnostics and diagnosticProvider are intentionally absent here:
  // production web already has them as false/undefined in PRODUCTION_WEB_CAPABILITIES,
  // and development web needs diagnostics enabled.
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
export type CapabilitiesConfiguration = {
  /** Production mode capabilities for web environments */
  production: ExtendedServerCapabilities;

  /** Production mode capabilities for desktop environments (minimal — document symbols only) */
  productionDesktop: ExtendedServerCapabilities;

  /** Development mode capabilities - full feature set */
  development: ExtendedServerCapabilities;
};

export type ImplicitCapabilties = {
  publishDiagnostics: boolean;
};

export type FindMissingArtifactCapability = {
  /** Whether the server/client supports finding missing artifacts */
  enabled: boolean;
  /** Supported resolution modes */
  supportedModes: ('blocking' | 'background')[];
  /** Maximum candidates to open per request */
  maxCandidatesToOpen?: number;
  /** Default timeout hint in milliseconds */
  timeoutMsHint?: number;
};

/**
 * Profiling capability configuration.
 * Profiling is only available in desktop environments (requires Node.js inspector API).
 */
export type ProfilingCapability = {
  /** Whether profiling handlers should be registered */
  enabled: boolean;
};

export type ExperimentalCapabilities = {
  /** Normalized support and enabled state for Apex language features. */
  featureStateProvider?: Record<
    string,
    { readonly supported: boolean; readonly enabled: boolean }
  >;
  /** Missing artifact resolution capability */
  findMissingArtifactProvider?: FindMissingArtifactCapability;
  /**
   * Profiling capability - desktop only.
   * Disabled for web platforms (see WEB_DISABLED_CAPABILITIES).
   */
  profilingProvider?: ProfilingCapability;
  /** Client supports apex/workspaceIngestionComplete notifications */
  workspaceIngestionProvider?: { enabled: boolean };
  /** Client supports apex/requestWorkspaceLoad notifications */
  requestWorkspaceLoadProvider?: { enabled: boolean };
  /** Client supports apex/queueStateChanged notifications (development mode only) */
  queueStateProvider?: { enabled: boolean };
};

/**
 * Configuration for client capabilities in different server modes
 * Mirrors CapabilitiesConfiguration structure for the client side
 */
export type ClientCapabilitiesConfiguration = {
  /** Production mode client capabilities */
  production: ClientCapabilities;

  /** Development mode client capabilities */
  development: ClientCapabilities;
};

/**
 * Production capabilities for web (browser) environments.
 * Exposes the full set of released language features available on the web platform.
 */
export const PRODUCTION_WEB_CAPABILITIES: ExtendedServerCapabilities = {
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
  completionProvider: undefined, // Not ready for production
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
  executeCommandProvider: {
    commands: Object.values(APEX_DEBUGGER_COMMANDS),
  },
  callHierarchyProvider: undefined,
  linkedEditingRangeProvider: undefined,
  semanticTokensProvider: SEMANTIC_TOKENS_PROVIDER,
  monikerProvider: undefined,
  typeHierarchyProvider: undefined,
  inlineValueProvider: undefined,
  inlayHintProvider: undefined,
  inlineCompletionProvider: undefined,
  experimental: {
    findMissingArtifactProvider: {
      enabled: true, // Enabled for production (hover, goto def, etc.)
      supportedModes: ['blocking', 'background'] as (
        'blocking' | 'background'
      )[],
      maxCandidatesToOpen: 3,
      timeoutMsHint: 1500,
    },
    // Profiling is desktop-only (requires Node.js inspector API)
    // Filtered out for web via WEB_DISABLED_CAPABILITIES
    profilingProvider: {
      enabled: false, // Disabled by default in production
    },
    workspaceIngestionProvider: {
      enabled: true,
    },
    requestWorkspaceLoadProvider: {
      enabled: true,
    },
  },
};

/**
 * Production capabilities for desktop environments.
 * Includes document symbols, semantic tokens, CodeLens, and debugger command metadata.
 * Other features (hover, definition, etc.) require further validation before desktop release.
 */
export const PRODUCTION_DESKTOP_CAPABILITIES: ExtendedServerCapabilities = {
  publishDiagnostics: false,
  textDocumentSync: {
    openClose: true,
    change: 1,
    save: true,
    willSave: false,
    willSaveWaitUntil: false,
  },
  documentSymbolProvider: true,
  codeLensProvider: {
    resolveProvider: false,
  },
  executeCommandProvider: {
    commands: Object.values(APEX_DEBUGGER_COMMANDS),
  },
  semanticTokensProvider: SEMANTIC_TOKENS_PROVIDER,
  workspace: {
    workspaceFolders: {
      supported: true,
      changeNotifications: true,
    },
  },
};

/**
 * Development capabilities - exposes which features are available in development
 * Includes both released and implemented features for testing
 */
export const DEVELOPMENT_CAPABILITIES: ExtendedServerCapabilities = {
  ...PRODUCTION_WEB_CAPABILITIES,
  publishDiagnostics: true,
  completionProvider: {
    resolveProvider: false,
    triggerCharacters: ['.', '@'],
  },
  foldingRangeProvider: true,
  hoverProvider: true,
  definitionProvider: true,
  implementationProvider: true,
  referencesProvider: true,
  // W-23631080: renameLocal validation + prepareRename support. prepareProvider
  // is now true, and the onPrepareRename handler (LCSAdapter) resolves the
  // identifier range + placeholder for locals. Later groups (fields/methods/types)
  // will extend both prepareRename and the rename validation.
  renameProvider: {
    prepareProvider: true,
  },
  codeActionProvider: {
    codeActionKinds: [CodeActionKind.QuickFix, CodeActionKind.RefactorExtract],
  },
  codeLensProvider: {
    resolveProvider: false,
  },
  diagnosticProvider: {
    identifier: 'apex-ls-ts',
    interFileDependencies: true,
    workspaceDiagnostics: false,
    workDoneProgress: true,
  },
  executeCommandProvider: {
    commands: Object.values(APEX_DEBUGGER_COMMANDS),
  },
  experimental: {
    findMissingArtifactProvider: {
      enabled: true, // Enabled by default in development
      supportedModes: ['blocking', 'background'] as (
        'blocking' | 'background'
      )[],
      maxCandidatesToOpen: 3,
      timeoutMsHint: 2000,
    },
    // Profiling is desktop-only (requires Node.js inspector API)
    // Filtered out for web via WEB_DISABLED_CAPABILITIES
    profilingProvider: {
      enabled: true, // Enabled by default in development
    },
    workspaceIngestionProvider: {
      enabled: true,
    },
    requestWorkspaceLoadProvider: {
      enabled: true,
    },
    queueStateProvider: {
      enabled: true, // Enabled by default in development
    },
  },
};

/**
 * Complete capability configuration for all modes
 */
export const CAPABILITIES_CONFIGURATION: CapabilitiesConfiguration = {
  production: PRODUCTION_WEB_CAPABILITIES,
  productionDesktop: PRODUCTION_DESKTOP_CAPABILITIES,
  development: DEVELOPMENT_CAPABILITIES,
};
