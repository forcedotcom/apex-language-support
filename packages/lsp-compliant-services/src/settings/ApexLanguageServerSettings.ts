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

  /** Server version for compatibility checks */
  version?: string;

  /**
   * General log level for the server (optional, from apex.logLevel)
   * Accepts: 'error', 'warning', 'info', 'log', 'debug'
   */
  logLevel?: string;
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
};

/**
 * Interface for validation result
 */
export interface ValidationResult {
  isValid: boolean;
  missingKeys: string[];
  invalidKeys: string[];
  details: string[];
}

/**
 * Enhanced validation function that provides detailed feedback about schema mismatches
 * This validates partial configurations - only checks the properties that are present
 */
export function validateApexSettings(obj: any): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    missingKeys: [],
    invalidKeys: [],
    details: [],
  };

  if (!obj || typeof obj !== 'object') {
    result.isValid = false;
    result.details.push(
      'Configuration object is null, undefined, or not an object',
    );
    return result;
  }

  // Define valid properties and their expected types
  const validTopLevelProps = {
    commentCollection: 'object',
    performance: 'object',
    environment: 'object',
    resources: 'object',
    version: 'string',
    logLevel: 'string',
  };

  // Check each provided property
  for (const [prop, value] of Object.entries(obj)) {
    if (!(prop in validTopLevelProps)) {
      result.details.push(`Unknown property: ${prop}`);
      // Don't mark as invalid for unknown properties, just log them
    } else {
      const expectedType =
        validTopLevelProps[prop as keyof typeof validTopLevelProps];
      const actualType = typeof value;

      if (actualType !== expectedType) {
        result.isValid = false;
        result.invalidKeys.push(prop);
        result.details.push(
          `Property ${prop} should be ${expectedType} but is ${actualType}`,
        );
      } else if (expectedType === 'object' && value === null) {
        result.isValid = false;
        result.invalidKeys.push(prop);
        result.details.push(`Property ${prop} should be an object but is null`);
      }
    }
  }

  return result;
}

/**
 * Type guard to check if an object is valid ApexLanguageServerSettings
 */
export function isValidApexSettings(
  obj: any,
): obj is ApexLanguageServerSettings {
  return validateApexSettings(obj).isValid;
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
    version: userSettings.version || baseDefaults.version,
    logLevel: userSettings.logLevel || baseDefaults.logLevel,
  };
}

/**
 * Merge partial settings with existing settings, preserving values that aren't being updated
 */
export function mergeWithExisting(
  existingSettings: ApexLanguageServerSettings,
  partialSettings: Partial<ApexLanguageServerSettings>,
): ApexLanguageServerSettings {
  return {
    commentCollection: {
      ...existingSettings.commentCollection,
      ...partialSettings.commentCollection,
    },
    performance: {
      ...existingSettings.performance,
      ...partialSettings.performance,
    },
    environment: {
      ...existingSettings.environment,
      ...partialSettings.environment,
    },
    resources: {
      ...existingSettings.resources,
      ...partialSettings.resources,
    },
    version: partialSettings.version ?? existingSettings.version,
    logLevel: partialSettings.logLevel ?? existingSettings.logLevel,
  };
}
