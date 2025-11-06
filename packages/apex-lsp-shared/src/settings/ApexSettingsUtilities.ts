/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type {
  ApexLanguageServerSettings,
  RuntimePlatform,
} from '../server/ApexLanguageServerSettings';

/**
 * Default settings for the Apex Language Server
 */
export const DEFAULT_APEX_SETTINGS: ApexLanguageServerSettings = {
  apex: {
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
      runtimePlatform: 'desktop', // Will be overridden by actual environment
      serverMode: 'production', // Will be overridden by actual environment
      enablePerformanceProfiling: false,
      profilingType: 'cpu',
      commentCollectionLogLevel: 'info',
    },
    resources: {
      loadMode: 'lazy',
      standardApexLibraryPath: undefined,
    },
    findMissingArtifact: {
      enabled: false,
      blockingWaitTimeoutMs: 2000,
      indexingBarrierPollMs: 100,
      maxCandidatesToOpen: 3,
      timeoutMsHint: 1500,
      enablePerfMarks: false,
    },
    loadWorkspace: {
      enabled: true,
      maxConcurrency: 50,
      yieldInterval: 50,
      yieldDelayMs: 25,
    },
    queueProcessing: {
      maxConcurrency: {
        IMMEDIATE: 50,
        HIGH: 50,
        NORMAL: 25,
        LOW: 10,
      },
      yieldInterval: 50,
      yieldDelayMs: 25,
    },
    worker: {
      logLevel: 'info',
    },
    version: undefined,
    logLevel: 'info',
  },
};

/**
 * Browser-optimized default settings
 */
export const BROWSER_DEFAULT_APEX_SETTINGS: ApexLanguageServerSettings = {
  apex: {
    ...DEFAULT_APEX_SETTINGS,
    commentCollection: {
      ...DEFAULT_APEX_SETTINGS.apex.commentCollection,
      // More conservative defaults for browser environment
      enableCommentCollection: true,
      associateCommentsWithSymbols: false, // More expensive in browser
    },
    performance: {
      ...DEFAULT_APEX_SETTINGS.apex.performance,
      commentCollectionMaxFileSize: 51200, // 50KB (smaller for browser)
      useAsyncCommentProcessing: true,
      documentChangeDebounceMs: 500, // Longer debounce for browser
    },
    environment: {
      ...DEFAULT_APEX_SETTINGS.apex.environment,
      runtimePlatform: 'web',
      serverMode: 'production',
      enablePerformanceProfiling: false, // Typically disabled in browser
      profilingType: 'cpu',
    },
    resources: {
      ...DEFAULT_APEX_SETTINGS.apex.resources,
      loadMode: 'lazy',
      standardApexLibraryPath: undefined,
    },
    findMissingArtifact: {
      ...DEFAULT_APEX_SETTINGS.apex.findMissingArtifact,
      // More conservative defaults for browser
      blockingWaitTimeoutMs: 1500, // Shorter timeout in browser
    },
    loadWorkspace: {
      ...DEFAULT_APEX_SETTINGS.apex.loadWorkspace,
      // More conservative defaults for browser
      maxConcurrency: 25, // Lower concurrency in browser
      yieldInterval: 25, // More frequent yielding in browser
    },
    queueProcessing: {
      ...DEFAULT_APEX_SETTINGS.apex.queueProcessing,
      // More conservative defaults for browser
      maxConcurrency: {
        IMMEDIATE: 25,
        HIGH: 25,
        NORMAL: 10,
        LOW: 5,
      },
      yieldInterval: 25, // More frequent yielding in browser
      yieldDelayMs: 25,
    },
    worker: {
      ...DEFAULT_APEX_SETTINGS.apex.worker,
    },
    version: undefined,
    logLevel: 'info',
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
    findMissingArtifact: 'object',
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
  environment: RuntimePlatform = 'desktop',
): ApexLanguageServerSettings {
  const baseDefaults =
    environment === 'web'
      ? BROWSER_DEFAULT_APEX_SETTINGS
      : DEFAULT_APEX_SETTINGS;

  return {
    apex: {
      commentCollection: {
        ...baseDefaults.apex.commentCollection,
        ...userSettings.apex?.commentCollection,
      },
      performance: {
        ...baseDefaults.apex.performance,
        ...userSettings.apex?.performance,
      },
      environment: {
        ...baseDefaults.apex.environment,
        runtimePlatform: environment,
        ...userSettings.apex?.environment,
      },
      resources: {
        ...baseDefaults.apex.resources,
        ...userSettings.apex?.resources,
      },
      findMissingArtifact: {
        ...baseDefaults.apex.findMissingArtifact,
        ...userSettings.apex?.findMissingArtifact,
      },
      loadWorkspace: {
        ...baseDefaults.apex.loadWorkspace,
        ...userSettings.apex?.loadWorkspace,
      },
      queueProcessing: {
        ...baseDefaults.apex.queueProcessing,
        ...userSettings.apex?.queueProcessing,
      },
      worker: {
        ...baseDefaults.apex.worker,
        ...userSettings.apex?.worker,
      },
      version: userSettings.apex?.version || baseDefaults.apex.version,
      logLevel: userSettings.apex?.logLevel || baseDefaults.apex.logLevel,
    },
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
    apex: {
      commentCollection: {
        ...existingSettings.apex.commentCollection,
        ...partialSettings.apex?.commentCollection,
      },
      performance: {
        ...existingSettings.apex.performance,
        ...partialSettings.apex?.performance,
      },
      environment: {
        ...existingSettings.apex.environment,
        ...partialSettings.apex?.environment,
      },
      resources: {
        ...existingSettings.apex.resources,
        ...partialSettings.apex?.resources,
      },
      findMissingArtifact: {
        ...existingSettings.apex.findMissingArtifact,
        ...partialSettings.apex?.findMissingArtifact,
      },
      loadWorkspace: {
        ...existingSettings.apex.loadWorkspace,
        ...partialSettings.apex?.loadWorkspace,
      },
      queueProcessing: {
        ...existingSettings.apex.queueProcessing,
        ...partialSettings.apex?.queueProcessing,
      },
      worker: {
        ...existingSettings.apex.worker,
        ...partialSettings.apex?.worker,
      },
      version: partialSettings.apex?.version ?? existingSettings.apex.version,
      logLevel:
        partialSettings.apex?.logLevel ?? existingSettings.apex.logLevel,
    },
  };
}
