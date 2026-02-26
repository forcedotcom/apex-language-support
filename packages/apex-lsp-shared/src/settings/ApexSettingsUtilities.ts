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
  SymbolGraphSettings,
  TelemetrySettings,
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
      enableForDocumentOpen: false,
      enableForDocumentSymbols: false,
      enableForFoldingRanges: false,
    },

    performance: {
      commentCollectionMaxFileSize: 102400,
      useAsyncCommentProcessing: true,
      documentChangeDebounceMs: 300,
    },

    environment: {
      runtimePlatform: 'desktop',
      serverMode: 'production',
      profilingMode: 'none',
      profilingType: 'cpu',
      commentCollectionLogLevel: 'info',
    },

    resources: {
      standardApexLibraryPath: undefined,
    },

    findMissingArtifact: {
      enabled: true,
      blockingWaitTimeoutMs: 2000,
      indexingBarrierPollMs: 100,
      maxCandidatesToOpen: 3,
      timeoutMsHint: 1500,
      enablePerfMarks: false,
    },

    loadWorkspace: {
      enabled: false,
      maxConcurrency: 4, // WAS 50
      yieldInterval: 10, // WAS 50
      yieldDelayMs: 25,
      batchSize: 100,
    },

    queueProcessing: {
      maxConcurrency: {
        CRITICAL: 4,
        IMMEDIATE: 4,
        HIGH: 2,
        NORMAL: 2,
        LOW: 2,
        BACKGROUND: 1,
      },

      // HARD CAP — do not derive from per-priority sums
      maxTotalConcurrency: 9,

      yieldInterval: 10,
      yieldDelayMs: 25,
    },

    scheduler: {
      queueCapacity: {
        CRITICAL: 128,
        IMMEDIATE: 128,
        HIGH: 128,
        NORMAL: 128,
        LOW: 256,
        BACKGROUND: 256,
      },

      maxHighPriorityStreak: 10,
      idleSleepMs: 25,
      queueStateNotificationIntervalMs: 500,
    },

    deferredReferenceProcessing: {
      deferredBatchSize: 10,
      initialReferenceBatchSize: 25,
      maxRetryAttempts: 5,
      retryDelayMs: 100,
      maxRetryDelayMs: 5000,
      queueCapacityThreshold: 85,
      queueDrainThreshold: 70,
      queueFullRetryDelayMs: 10000,
      maxQueueFullRetryDelayMs: 30000,
      circuitBreakerFailureThreshold: 5,
      circuitBreakerResetThreshold: 50,
      maxDeferredTasksPerSecond: 5,
      yieldTimeThresholdMs: 50,
    },

    symbolGraph: {
      enabled: true,
      preloadNamespaces: ['Database', 'System'],
    },

    telemetry: {
      enabled: false,
      localTracingEnabled: false,
      consoleTracingEnabled: false,
    },

    worker: {
      logLevel: 'info',
    },

    version: undefined,
    logLevel: 'info',
  },
};

/**
 * Calculate default maxTotalConcurrency from per-priority maxConcurrency
 * Returns sum of per-priority limits * 1.2 (20% buffer)
 */
function calculateDefaultMaxTotalConcurrency(
  maxConcurrency: Record<string, number>,
): number {
  const sum = Object.values(maxConcurrency).reduce((a, b) => a + b, 0);
  return Math.ceil(sum * 1.2); // 20% buffer
}

/**
 * Browser-optimized default settings
 */
export const BROWSER_DEFAULT_APEX_SETTINGS: Partial<ApexLanguageServerSettings> =
  {
    apex: {
      ...DEFAULT_APEX_SETTINGS.apex,

      commentCollection: {
        ...DEFAULT_APEX_SETTINGS.apex.commentCollection,
        enableForDocumentOpen: false,
        associateCommentsWithSymbols: false,
      },

      performance: {
        ...DEFAULT_APEX_SETTINGS.apex.performance,
        commentCollectionMaxFileSize: 51200,
        documentChangeDebounceMs: 500,
      },

      environment: {
        ...DEFAULT_APEX_SETTINGS.apex.environment,
        runtimePlatform: 'web',
        profilingMode: 'none',
      },

      loadWorkspace: {
        enabled: false,
        maxConcurrency: 2,
        yieldInterval: 5,
        yieldDelayMs: 25,
        batchSize: 100,
      },

      queueProcessing: {
        maxConcurrency: {
          CRITICAL: 2,
          IMMEDIATE: 2,
          HIGH: 1,
          NORMAL: 1,
          LOW: 1,
          BACKGROUND: 1,
        },
        maxTotalConcurrency: 4,
        yieldInterval: 5,
        yieldDelayMs: 25,
      },

      scheduler: {
        queueCapacity: {
          CRITICAL: 64,
          IMMEDIATE: 64,
          HIGH: 64,
          NORMAL: 64,
          LOW: 128,
          BACKGROUND: 128,
        },
        idleSleepMs: 50,
        maxHighPriorityStreak: 5,
        queueStateNotificationIntervalMs: 0,
      },
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

  // Ensure we always have a full apex object by merging with DEFAULT_APEX_SETTINGS
  const baseApex = {
    ...DEFAULT_APEX_SETTINGS.apex,
    ...baseDefaults.apex,
  };

  return {
    apex: {
      commentCollection: {
        ...baseApex.commentCollection,
        ...userSettings.apex?.commentCollection,
      },
      performance: {
        ...baseApex.performance,
        ...userSettings.apex?.performance,
      },
      environment: {
        ...baseApex.environment,
        runtimePlatform: environment,
        ...userSettings.apex?.environment,
      },
      resources: {
        ...baseApex.resources,
        ...userSettings.apex?.resources,
      },
      findMissingArtifact: {
        ...baseApex.findMissingArtifact,
        ...userSettings.apex?.findMissingArtifact,
      },
      loadWorkspace: {
        ...baseApex.loadWorkspace,
        ...userSettings.apex?.loadWorkspace,
      },
      queueProcessing: {
        ...baseApex.queueProcessing,
        ...userSettings.apex?.queueProcessing,
        maxConcurrency: {
          ...baseApex.queueProcessing.maxConcurrency,
          ...userSettings.apex?.queueProcessing?.maxConcurrency,
        },
        // Calculate maxTotalConcurrency if not provided
        maxTotalConcurrency:
          userSettings.apex?.queueProcessing?.maxTotalConcurrency ??
          baseApex.queueProcessing.maxTotalConcurrency ??
          calculateDefaultMaxTotalConcurrency({
            ...baseApex.queueProcessing.maxConcurrency,
            ...userSettings.apex?.queueProcessing?.maxConcurrency,
          }),
      },
      scheduler: {
        ...baseApex.scheduler,
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
            : typeof baseApex.scheduler.queueCapacity === 'number'
              ? {
                  CRITICAL: baseApex.scheduler.queueCapacity,
                  IMMEDIATE: baseApex.scheduler.queueCapacity,
                  HIGH: baseApex.scheduler.queueCapacity,
                  NORMAL: baseApex.scheduler.queueCapacity,
                  LOW: baseApex.scheduler.queueCapacity,
                  BACKGROUND: baseApex.scheduler.queueCapacity,
                }
              : {
                  ...(baseApex.scheduler.queueCapacity as Record<
                    string,
                    number
                  >),
                  ...(userSettings.apex?.scheduler?.queueCapacity as
                    | Record<string, number>
                    | undefined),
                },
      },
      deferredReferenceProcessing: baseApex.deferredReferenceProcessing
        ? {
            ...baseApex.deferredReferenceProcessing,
            ...userSettings.apex?.deferredReferenceProcessing,
          }
        : userSettings.apex?.deferredReferenceProcessing,
      symbolGraph: baseApex.symbolGraph
        ? {
            ...baseApex.symbolGraph,
            ...userSettings.apex?.symbolGraph,
          }
        : userSettings.apex?.symbolGraph,
      telemetry: baseApex.telemetry
        ? {
            ...baseApex.telemetry,
            ...userSettings.apex?.telemetry,
          }
        : userSettings.apex?.telemetry,
      worker: {
        ...baseApex.worker,
        ...userSettings.apex?.worker,
      },
      version: userSettings.apex?.version || baseApex.version,
      logLevel: userSettings.apex?.logLevel || baseApex.logLevel,
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
                  ...(partialSettings.apex?.scheduler?.queueCapacity as
                    | Record<string, number>
                    | undefined),
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
      symbolGraph:
        existingSettings.apex.symbolGraph || partialSettings.apex?.symbolGraph
          ? ({
              ...DEFAULT_APEX_SETTINGS.apex.symbolGraph!,
              ...existingSettings.apex.symbolGraph,
              ...partialSettings.apex?.symbolGraph,
            } as SymbolGraphSettings)
          : undefined,
      telemetry:
        existingSettings.apex.telemetry || partialSettings.apex?.telemetry
          ? ({
              ...DEFAULT_APEX_SETTINGS.apex.telemetry!,
              ...existingSettings.apex.telemetry,
              ...partialSettings.apex?.telemetry,
            } as TelemetrySettings)
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
