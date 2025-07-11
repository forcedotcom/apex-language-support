/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Comment collection settings for different LSP operations
 */
export interface CommentCollectionSettings {
  /** Whether to collect comments during document parsing (default: true) */
  enableCommentCollection: boolean;

  /** Whether to include single-line (//) comments (default: false) */
  includeSingleLineComments: boolean;

  /** Whether to associate comments with symbols for enhanced features (default: false) */
  associateCommentsWithSymbols: boolean;

  /** Enable comment collection for document change events (default: true) */
  enableForDocumentChanges: boolean;

  /** Enable comment collection for document open events (default: true) */
  enableForDocumentOpen: boolean;

  /** Enable comment collection for document symbols (default: false for performance) */
  enableForDocumentSymbols: boolean;

  /** Enable comment collection for folding ranges (default: false for performance) */
  enableForFoldingRanges: boolean;

  /** Enable comment collection for diagnostic requests (default: false) */
  enableForDiagnostics: boolean;
}

/**
 * Performance-related settings that may affect comment collection
 */
export interface PerformanceSettings {
  /** Maximum file size (in bytes) for enabling comment collection (default: 100KB) */
  commentCollectionMaxFileSize: number;

  /** Whether to use async comment processing for large files (default: true) */
  useAsyncCommentProcessing: boolean;

  /** Debounce delay for document change comment processing in ms (default: 300) */
  documentChangeDebounceMs: number;
}

/**
 * Environment-specific settings
 */
export interface EnvironmentSettings {
  /** Current environment (node, browser, web-worker) */
  environment: 'node' | 'browser' | 'web-worker';

  /** Whether to log comment collection performance metrics (default: false) */
  enablePerformanceLogging: boolean;

  /** Log level for comment collection (default: 'info') */
  commentCollectionLogLevel: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * Resource loading settings
 */
export interface ResourceSettings {
  /** Resource loading mode (default: 'full' for Node.js, 'lazy' for browser) */
  loadMode: 'lazy' | 'full';
}

/**
 * Diagnostic settings
 */
export interface DiagnosticSettings {
  /** Enable pull-based diagnostics (textDocument/diagnostic) */
  enablePullDiagnostics: boolean;
  /** Enable push-based diagnostics (textDocument/publishDiagnostics) */
  enablePushDiagnostics: boolean;
  /** Maximum number of diagnostics per file */
  maxDiagnosticsPerFile: number;
  /** Include warnings in diagnostics */
  includeWarnings: boolean;
  /** Include info messages in diagnostics */
  includeInfo: boolean;
}

/**
 * Complete Apex Language Server settings
 */
export interface ApexLanguageServerSettings {
  /** Comment collection configuration */
  commentCollection: CommentCollectionSettings;

  /** Performance-related settings */
  performance: PerformanceSettings;

  /** Environment-specific settings */
  environment: EnvironmentSettings;

  /** Resource loading settings */
  resources: ResourceSettings;

  /** Diagnostic settings */
  diagnostics: DiagnosticSettings;

  /** Server version for compatibility checks */
  version?: string;

  /**
   * General log level for the server (optional, from apex.ls.logLevel)
   * Accepts: 'error', 'warning', 'info', 'log', 'debug'
   */
  ls?: {
    logLevel?: string;
  };
}

/**
 * Default settings for the Apex Language Server
 */
export const DEFAULT_APEX_SETTINGS: ApexLanguageServerSettings = {
  commentCollection: {
    enableCommentCollection: true,
    includeSingleLineComments: false,
    associateCommentsWithSymbols: false,
    enableForDocumentChanges: true,
    enableForDocumentOpen: true,
    enableForDocumentSymbols: false, // Disabled for performance
    enableForFoldingRanges: false, // Disabled for performance
    enableForDiagnostics: false,
  },
  performance: {
    commentCollectionMaxFileSize: 102400, // 100KB
    useAsyncCommentProcessing: true,
    documentChangeDebounceMs: 300,
  },
  environment: {
    environment: 'node', // Will be overridden by actual environment
    enablePerformanceLogging: false,
    commentCollectionLogLevel: 'info',
  },
  resources: {
    loadMode: 'full',
  },
  diagnostics: {
    enablePullDiagnostics: true,
    enablePushDiagnostics: true,
    maxDiagnosticsPerFile: 100,
    includeWarnings: true,
    includeInfo: true,
  },
};

/**
 * Browser-optimized default settings
 */
export const BROWSER_DEFAULT_APEX_SETTINGS: ApexLanguageServerSettings = {
  ...DEFAULT_APEX_SETTINGS,
  commentCollection: {
    ...DEFAULT_APEX_SETTINGS.commentCollection,
    // More conservative defaults for browser environment
    enableCommentCollection: true,
    associateCommentsWithSymbols: false, // More expensive in browser
    enableForDiagnostics: false,
  },
  performance: {
    ...DEFAULT_APEX_SETTINGS.performance,
    commentCollectionMaxFileSize: 51200, // 50KB (smaller for browser)
    useAsyncCommentProcessing: true,
    documentChangeDebounceMs: 500, // Longer debounce for browser
  },
  environment: {
    ...DEFAULT_APEX_SETTINGS.environment,
    environment: 'browser',
    enablePerformanceLogging: false, // Typically disabled in browser
  },
  resources: {
    ...DEFAULT_APEX_SETTINGS.resources,
    loadMode: 'lazy',
  },
  diagnostics: {
    ...DEFAULT_APEX_SETTINGS.diagnostics,
    maxDiagnosticsPerFile: 50,
  },
};

/**
 * Type guard to check if an object is valid ApexLanguageServerSettings
 */
export function isValidApexSettings(
  obj: any,
): obj is ApexLanguageServerSettings {
  return (
    obj &&
    typeof obj === 'object' &&
    obj.commentCollection &&
    typeof obj.commentCollection === 'object' &&
    obj.performance &&
    typeof obj.performance === 'object' &&
    obj.environment &&
    typeof obj.environment === 'object' &&
    obj.resources &&
    typeof obj.resources === 'object' &&
    obj.diagnostics &&
    typeof obj.diagnostics === 'object'
  );
}

/**
 * Merge user settings with defaults, ensuring all required properties exist
 */
export function mergeWithDefaults(
  userSettings: Partial<ApexLanguageServerSettings>,
  environment: 'node' | 'browser' = 'node',
): ApexLanguageServerSettings {
  const baseDefaults =
    environment === 'browser'
      ? BROWSER_DEFAULT_APEX_SETTINGS
      : DEFAULT_APEX_SETTINGS;

  return {
    commentCollection: {
      ...baseDefaults.commentCollection,
      ...userSettings.commentCollection,
    },
    performance: {
      ...baseDefaults.performance,
      ...userSettings.performance,
    },
    environment: {
      ...baseDefaults.environment,
      environment,
      ...userSettings.environment,
    },
    resources: {
      ...baseDefaults.resources,
      ...userSettings.resources,
    },
    diagnostics: {
      ...baseDefaults.diagnostics,
      ...userSettings.diagnostics,
    },
    version: userSettings.version || baseDefaults.version,
    ls: userSettings.ls || baseDefaults.ls,
  };
}
