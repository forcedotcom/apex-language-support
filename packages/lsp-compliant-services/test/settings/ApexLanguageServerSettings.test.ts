/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  validateApexSettings,
  isValidApexSettings,
  mergeWithDefaults,
  mergeWithExisting,
  ApexLanguageServerSettings,
  ApexSettingsManager,
} from '@salesforce/apex-lsp-shared';

describe('ApexLanguageServerSettings Validation', () => {
  describe('validateApexSettings', () => {
    it('should accept complete valid configuration', () => {
      const completeConfig = {
        commentCollection: {
          enableCommentCollection: true,
        },
        performance: {
          commentCollectionMaxFileSize: 102400,
        },
        environment: {
          enablePerformanceProfiling: false,
          profilingType: 'cpu',
        },
        resources: {
          loadMode: 'lazy' as const,
        },
        logLevel: 'info',
      };

      const result = validateApexSettings(completeConfig);

      expect(result.isValid).toBe(true);
      expect(result.missingKeys).toHaveLength(0);
      expect(result.invalidKeys).toHaveLength(0);
      expect(result.details).toHaveLength(0);
    });

    it('should accept partial configuration with only logLevel', () => {
      const partialConfig = {
        logLevel: 'debug',
      };

      const result = validateApexSettings(partialConfig);

      expect(result.isValid).toBe(true);
      expect(result.missingKeys).toHaveLength(0);
      expect(result.invalidKeys).toHaveLength(0);
      expect(result.details).toHaveLength(0);
    });

    it('should accept partial configuration with only one section', () => {
      const partialConfig = {
        performance: {
          commentCollectionMaxFileSize: 50000,
        },
      };

      const result = validateApexSettings(partialConfig);

      expect(result.isValid).toBe(true);
      expect(result.missingKeys).toHaveLength(0);
      expect(result.invalidKeys).toHaveLength(0);
      expect(result.details).toHaveLength(0);
    });

    it('should reject configuration with wrong type for logLevel', () => {
      const invalidConfig = {
        logLevel: 123, // Should be string
      };

      const result = validateApexSettings(invalidConfig);

      expect(result.isValid).toBe(false);
      expect(result.invalidKeys).toContain('logLevel');
      expect(result.details).toContain(
        'Property logLevel should be string but is number',
      );
    });

    it('should reject configuration with wrong type for object properties', () => {
      const invalidConfig = {
        commentCollection: 'invalid', // Should be object
        performance: null, // Should be object
      };

      const result = validateApexSettings(invalidConfig);

      expect(result.isValid).toBe(false);
      expect(result.invalidKeys).toContain('commentCollection');
      expect(result.invalidKeys).toContain('performance');
      expect(result.details).toContain(
        'Property commentCollection should be object but is string',
      );
      expect(result.details).toContain(
        'Property performance should be an object but is null',
      );
    });

    it('should handle unknown properties gracefully', () => {
      const configWithUnknown = {
        logLevel: 'info',
        unknownProperty: 'value',
        anotherUnknown: 123,
      };

      const result = validateApexSettings(configWithUnknown);

      // Should still be valid, but unknown properties are noted
      expect(result.isValid).toBe(true);
      expect(result.details).toContain('Unknown property: unknownProperty');
      expect(result.details).toContain('Unknown property: anotherUnknown');
    });

    it('should reject null or undefined configuration', () => {
      const nullResult = validateApexSettings(null);
      expect(nullResult.isValid).toBe(false);
      expect(nullResult.details).toContain(
        'Configuration object is null, undefined, or not an object',
      );

      const undefinedResult = validateApexSettings(undefined);
      expect(undefinedResult.isValid).toBe(false);
      expect(undefinedResult.details).toContain(
        'Configuration object is null, undefined, or not an object',
      );
    });

    it('should reject non-object configuration', () => {
      const result = validateApexSettings('not an object');

      expect(result.isValid).toBe(false);
      expect(result.details).toContain(
        'Configuration object is null, undefined, or not an object',
      );
    });

    it('should handle empty configuration object', () => {
      const result = validateApexSettings({});

      expect(result.isValid).toBe(true);
      expect(result.missingKeys).toHaveLength(0);
      expect(result.invalidKeys).toHaveLength(0);
      expect(result.details).toHaveLength(0);
    });

    it('should validate all known property types correctly', () => {
      const validConfig = {
        commentCollection: { enableCommentCollection: true },
        performance: { commentCollectionMaxFileSize: 100 },
        environment: { enablePerformanceProfiling: false, profilingType: 'cpu' },
        resources: { loadMode: 'full' },
        version: '1.0.0',
        logLevel: 'debug',
      };

      const result = validateApexSettings(validConfig);

      expect(result.isValid).toBe(true);
      expect(result.details).toHaveLength(0);
    });
  });

  describe('isValidApexSettings', () => {
    it('should return true for valid partial configurations', () => {
      expect(isValidApexSettings({ logLevel: 'info' })).toBe(true);
      expect(
        isValidApexSettings({
          performance: { commentCollectionMaxFileSize: 100 },
        }),
      ).toBe(true);
      expect(isValidApexSettings({})).toBe(true);
    });

    it('should return false for invalid configurations', () => {
      expect(isValidApexSettings({ logLevel: 123 })).toBe(false);
      expect(isValidApexSettings({ commentCollection: 'invalid' })).toBe(false);
      expect(isValidApexSettings(null)).toBe(false);
      expect(isValidApexSettings(undefined)).toBe(false);
    });
  });

  describe('mergeWithDefaults', () => {
    it('should merge partial configuration with defaults', () => {
      const partialConfig = {
        apex: {
          logLevel: 'debug',
          performance: {
            commentCollectionMaxFileSize: 50000,
          },
        },
      } as Partial<ApexLanguageServerSettings>;

      const result = mergeWithDefaults(partialConfig, 'desktop');

      expect(result.apex.logLevel).toBe('debug');
      expect(result.apex.performance.commentCollectionMaxFileSize).toBe(50000);
      expect(result.apex.performance.useAsyncCommentProcessing).toBe(true); // From defaults
      expect(result.apex.commentCollection.enableCommentCollection).toBe(true); // From defaults
      expect(result.apex.resources.loadMode).toBe('lazy'); // From defaults for desktop
    });

    it('should use browser defaults when environment is browser', () => {
      const result = mergeWithDefaults({}, 'web');

      expect(result.apex.environment.runtimePlatform).toBe('web');
      expect(result.apex.resources.loadMode).toBe('lazy'); // Browser default
      expect(result.apex.performance.commentCollectionMaxFileSize).toBe(51200); // Browser default
    });
  });

  describe('mergeWithExisting', () => {
    it('should preserve existing settings not included in partial update', () => {
      const existingSettings = mergeWithDefaults(
        {
          apex: {
            resources: { loadMode: 'lazy' },
            logLevel: 'info',
            commentCollection: {
              enableCommentCollection: true,
              includeSingleLineComments: false,
              associateCommentsWithSymbols: false,
              enableForDocumentChanges: true,
              enableForDocumentOpen: true,
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
              enablePerformanceProfiling: false,
              profilingType: 'cpu',
              commentCollectionLogLevel: 'info',
            },
            findMissingArtifact: {
              enabled: false,
              blockingWaitTimeoutMs: 2000,
              indexingBarrierPollMs: 100,
              maxCandidatesToOpen: 3,
              timeoutMsHint: 1500,
              enablePerfMarks: false,
            },
            worker: {
              logLevel: 'info',
            },
          },
        },
        'desktop',
      );

      const partialUpdate = {
        apex: {
          logLevel: 'debug',
        },
      } as Partial<ApexLanguageServerSettings>;

      const result = mergeWithExisting(existingSettings, partialUpdate);

      expect(result.apex.logLevel).toBe('debug'); // Updated
      expect(result.apex.resources.loadMode).toBe('lazy'); // Preserved from existing
      expect(result.apex.commentCollection.enableCommentCollection).toBe(true); // From existing (which had defaults)
    });

    it('should update nested properties while preserving others', () => {
      const existingSettings = mergeWithDefaults(
        {
          apex: {
            performance: {
              commentCollectionMaxFileSize: 50000,
              useAsyncCommentProcessing: false,
              documentChangeDebounceMs: 300,
            },
            resources: { loadMode: 'lazy' },
          },
        } as Partial<ApexLanguageServerSettings>,
        'desktop',
      );

      const partialUpdate = {
        apex: {
          performance: {
            commentCollectionMaxFileSize: 75000, // Only updating this one property
          },
        },
      } as Partial<ApexLanguageServerSettings>;

      const result = mergeWithExisting(existingSettings, partialUpdate);

      expect(result.apex.performance.commentCollectionMaxFileSize).toBe(75000); // Updated
      expect(result.apex.performance.useAsyncCommentProcessing).toBe(false); // Preserved from existing
      expect(result.apex.resources.loadMode).toBe('lazy'); // Preserved from existing
    });
  });

  describe('ApexSettingsManager integration', () => {
    beforeEach(() => {
      // Reset the singleton before each test
      ApexSettingsManager.resetInstance();
    });

    it('should preserve user settings during partial configuration updates', () => {
      // Initialize with user setting for lazy loading
      const initialSettings = {
        apex: {
          resources: { loadMode: 'lazy' as const },
          logLevel: 'info',
          commentCollection: {
            enableCommentCollection: true,
            includeSingleLineComments: false,
            associateCommentsWithSymbols: false,
            enableForDocumentChanges: true,
            enableForDocumentOpen: true,
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
            enablePerformanceProfiling: false,
            profilingType: 'cpu',
            commentCollectionLogLevel: 'info',
          },
          findMissingArtifact: {
            enabled: false,
            blockingWaitTimeoutMs: 2000,
            indexingBarrierPollMs: 100,
            maxCandidatesToOpen: 3,
            timeoutMsHint: 1500,
            enablePerfMarks: false,
          },
          worker: {
            logLevel: 'info',
          },
        },
      } as Partial<ApexLanguageServerSettings>;

      const manager = ApexSettingsManager.getInstance(
        initialSettings,
        'desktop',
      );

      // Verify initial state
      expect(manager.getResourceLoadMode()).toBe('lazy');
      expect(manager.getSettings().apex.logLevel).toBe('info');

      // Simulate a partial configuration update (like changing only log level)
      manager.updateSettings({
        apex: {
          logLevel: 'debug',
        },
      } as Partial<ApexLanguageServerSettings>);

      // The user's lazy loading setting should be preserved
      expect(manager.getResourceLoadMode()).toBe('lazy');
      expect(manager.getSettings().apex.logLevel).toBe('debug');
    });

    it('should allow updating resource settings while preserving other user settings', () => {
      const initialSettings = {
        apex: {
          resources: { loadMode: 'lazy' as const },
          performance: {
            commentCollectionMaxFileSize: 50000,
            useAsyncCommentProcessing: true,
            documentChangeDebounceMs: 300,
          },
          logLevel: 'info',
        },
      } as Partial<ApexLanguageServerSettings>;

      const manager = ApexSettingsManager.getInstance(
        initialSettings,
        'desktop',
      );

      // Update just the resource loading mode
      manager.updateSettings({
        apex: {
          resources: { loadMode: 'full' },
        },
      } as Partial<ApexLanguageServerSettings>);

      // Resource mode should be updated, but other user settings preserved
      expect(manager.getResourceLoadMode()).toBe('full');
      expect(
        manager.getSettings().apex.performance.commentCollectionMaxFileSize,
      ).toBe(50000);
      expect(manager.getSettings().apex.logLevel).toBe('info');
    });
  });
});
