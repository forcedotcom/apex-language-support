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
// Platform Constraint Types
// ============================================================================

/**
 * Wrapper for capabilities that may have platform constraints.
 * If a capability is just a value (boolean, object), it's available on all platforms.
 * Use this wrapper to add platform-specific disable flags.
 *
 * @example
 * // Desktop-only capability (disabled for web)
 * profilingProvider: {
 *   value: { enabled: true },
 *   disabledForWeb: true,
 * }
 *
 * @example
 * // Web-only capability (disabled for desktop)
 * webOnlyFeature: {
 *   value: true,
 *   disabledForDesktop: true,
 * }
 */
export interface PlatformConstrainedCapability<T> {
  /** The actual capability value */
  value: T;
  /** If true, this capability is disabled in web environments */
  disabledForWeb?: boolean;
  /** If true, this capability is disabled in desktop environments */
  disabledForDesktop?: boolean;
}

/**
 * Infers the value type from a PlatformConstrainedCapability.
 * If T has a `value` property, extracts its type; otherwise returns never.
 */
type InferConstrainedValue<T> = T extends { value: infer V } ? V : never;

/**
 * Type guard to check if a capability has platform constraints.
 * Returns true if the capability is wrapped with platform constraint flags.
 *
 * @param capability - The capability value to check
 * @returns True if the capability has platform constraint flags
 */
export function isPlatformConstrained<T>(
  capability: T,
): capability is T & PlatformConstrainedCapability<InferConstrainedValue<T>> {
  return (
    typeof capability === 'object' &&
    capability !== null &&
    'value' in capability &&
    ('disabledForWeb' in capability || 'disabledForDesktop' in capability)
  );
}

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
   * Wrapped with PlatformConstrainedCapability with disabledForWeb: true.
   */
  profilingProvider?: PlatformConstrainedCapability<ProfilingCapability>;
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
  foldingRangeProvider: false,
  codeLensProvider: {
    resolveProvider: false,
  },
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
      enabled: false, // Disabled by default in production
      supportedModes: ['blocking', 'background'],
      maxCandidatesToOpen: 3,
      timeoutMsHint: 1500,
    },
    // Profiling is desktop-only (requires Node.js inspector API)
    profilingProvider: {
      value: { enabled: false }, // Disabled by default in production
      disabledForWeb: true,
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
  referencesProvider: true, // ENABLED: References implementation
  codeLensProvider: {
    resolveProvider: false,
  },
  diagnosticProvider: {
    identifier: 'apex-ls-ts',
    interFileDependencies: true,
    workspaceDiagnostics: false,
  },
  experimental: {
    findMissingArtifactProvider: {
      enabled: true, // Enabled by default in development
      supportedModes: ['blocking', 'background'],
      maxCandidatesToOpen: 3,
      timeoutMsHint: 2000,
    },
    // Profiling is desktop-only (requires Node.js inspector API)
    profilingProvider: {
      value: { enabled: true }, // Enabled by default in development
      disabledForWeb: true,
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
