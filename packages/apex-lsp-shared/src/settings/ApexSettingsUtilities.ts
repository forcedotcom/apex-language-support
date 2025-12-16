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
  DeferredReferenceProcessingSettings,
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
      profilingMode: 'none',
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
        CRITICAL: 100, // Ephemeral Critical queue - higher concurrency for system tasks
        IMMEDIATE: 50,
        HIGH: 50,
        NORMAL: 25,
        LOW: 10,
        BACKGROUND: 5,
      },
      yieldInterval: 50,
      yieldDelayMs: 25,
    },
    scheduler: {
      queueCapacity: {
        CRITICAL: 200,
        IMMEDIATE: 200,
        HIGH: 200,
        NORMAL: 200,
        LOW: 200,
        BACKGROUND: 200,
      },
      maxHighPriorityStreak: 50,
      idleSleepMs: 1,
    },
    deferredReferenceProcessing: {
      deferredBatchSize: 50,
      maxRetryAttempts: 10,
      retryDelayMs: 100,
      maxRetryDelayMs: 5000,
      queueCapacityThreshold: 90,
      queueDrainThreshold: 75,
      queueFullRetryDelayMs: 10000,
      maxQueueFullRetryDelayMs: 30000,
      circuitBreakerFailureThreshold: 5,
      circuitBreakerResetThreshold: 50,
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
      profilingMode: 'none', // Profiling typically disabled in browser
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
        CRITICAL: 50, // Lower than desktop but still higher for system tasks
        IMMEDIATE: 25,
        HIGH: 25,
        NORMAL: 10,
        LOW: 5,
        BACKGROUND: 3,
      },
      yieldInterval: 25, // More frequent yielding in browser
      yieldDelayMs: 25,
    },
    scheduler: {
      ...DEFAULT_APEX_SETTINGS.apex.scheduler,
      // More conservative defaults for browser
      queueCapacity: {
        CRITICAL: 64,
        IMMEDIATE: 64,
        HIGH: 64,
        NORMAL: 64,
        LOW: 64,
        BACKGROUND: 64,
      },
    },
    deferredReferenceProcessing: {
      deferredBatchSize: 25, // Smaller batches in browser
      maxRetryAttempts: 5, // Fewer retries in browser
      retryDelayMs: 100,
      maxRetryDelayMs: 5000,
      queueCapacityThreshold: 90,
      queueDrainThreshold: 75,
      queueFullRetryDelayMs: 10000,
      maxQueueFullRetryDelayMs: 30000,
      circuitBreakerFailureThreshold: 5,
      circuitBreakerResetThreshold: 50,
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
        maxConcurrency: {
          ...baseDefaults.apex.queueProcessing.maxConcurrency,
          ...userSettings.apex?.queueProcessing?.maxConcurrency,
        },
      },
      scheduler: {
        ...baseDefaults.apex.scheduler,
        ...userSettings.apex?.scheduler,
        // Handle backward compatibility: if queueCapacity is a number, convert to per-priority object
        queueCapacity:
          typeof userSettings.apex?.scheduler?.queueCapacity === 'number'
            ? {
                CRITICAL: userSettings.apex.scheduler.queueCapacity,
                IMMEDIATE: userSettings.apex.scheduler.queueCapacity,
                HIGH: userSettings.apex.scheduler.queueCapacity,
                NORMAL: userSettings.apex.scheduler.queueCapacity,
                LOW: userSettings.apex.scheduler.queueCapacity,
                BACKGROUND: userSettings.apex.scheduler.queueCapacity,
              }
            : typeof baseDefaults.apex.scheduler.queueCapacity === 'number'
              ? {
                  CRITICAL: baseDefaults.apex.scheduler.queueCapacity,
                  IMMEDIATE: baseDefaults.apex.scheduler.queueCapacity,
                  HIGH: baseDefaults.apex.scheduler.queueCapacity,
                  NORMAL: baseDefaults.apex.scheduler.queueCapacity,
                  LOW: baseDefaults.apex.scheduler.queueCapacity,
                  BACKGROUND: baseDefaults.apex.scheduler.queueCapacity,
                }
              : {
                  ...(baseDefaults.apex.scheduler.queueCapacity as Record<
                    string,
                    number
                 >),
                  ...(userSettings.apex?.scheduler?.queueCapacity as Record<
                    string,
                    number
                 > | undefined),
                },
      },
      deferredReferenceProcessing: baseDefaults.apex
        .deferredReferenceProcessing
        ? {
            ...baseDefaults.apex.deferredReferenceProcessing,
            ...userSettings.apex?.deferredReferenceProcessing,
          }
        : userSettings.apex?.deferredReferenceProcessing,
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
        maxConcurrency: {
          ...existingSettings.apex.queueProcessing.maxConcurrency,
          ...partialSettings.apex?.queueProcessing?.maxConcurrency,
        },
      },
      scheduler: {
        ...existingSettings.apex.scheduler,
        ...partialSettings.apex?.scheduler,
        // Handle backward compatibility: merge queueCapacity properly
        queueCapacity:
          typeof partialSettings.apex?.scheduler?.queueCapacity === 'number'
            ? {
                CRITICAL: partialSettings.apex.scheduler.queueCapacity,
                IMMEDIATE: partialSettings.apex.scheduler.queueCapacity,
                HIGH: partialSettings.apex.scheduler.queueCapacity,
                NORMAL: partialSettings.apex.scheduler.queueCapacity,
                LOW: partialSettings.apex.scheduler.queueCapacity,
                BACKGROUND: partialSettings.apex.scheduler.queueCapacity,
              }
            : typeof existingSettings.apex.scheduler.queueCapacity === 'number'
              ? {
                  CRITICAL: existingSettings.apex.scheduler.queueCapacity,
                  IMMEDIATE: existingSettings.apex.scheduler.queueCapacity,
                  HIGH: existingSettings.apex.scheduler.queueCapacity,
                  NORMAL: existingSettings.apex.scheduler.queueCapacity,
                  LOW: existingSettings.apex.scheduler.queueCapacity,
                  BACKGROUND: existingSettings.apex.scheduler.queueCapacity,
                }
              : {
                  ...(existingSettings.apex.scheduler.queueCapacity as Record<
                    string,
                    number
                 >),
                  ...(partialSettings.apex?.scheduler?.queueCapacity as Record<
                    string,
                    number
                 > | undefined),
                },
      },
      deferredReferenceProcessing:
        existingSettings.apex.deferredReferenceProcessing ||
        partialSettings.apex?.deferredReferenceProcessing
          ? ({
              ...DEFAULT_APEX_SETTINGS.apex.deferredReferenceProcessing!,
              ...existingSettings.apex.deferredReferenceProcessing,
              ...partialSettings.apex?.deferredReferenceProcessing,
            } as DeferredReferenceProcessingSettings)
          : undefined,
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
