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
} from '../../src/settings/ApexLanguageServerSettings';

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
          enablePerformanceLogging: false,
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
        environment: { enablePerformanceLogging: false },
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
        logLevel: 'debug',
        performance: {
          commentCollectionMaxFileSize: 50000,
        },
      } as Partial<ApexLanguageServerSettings>;

      const result = mergeWithDefaults(partialConfig, 'node');

      expect(result.logLevel).toBe('debug');
      expect(result.performance.commentCollectionMaxFileSize).toBe(50000);
      expect(result.performance.useAsyncCommentProcessing).toBe(true); // From defaults
      expect(result.commentCollection.enableCommentCollection).toBe(true); // From defaults
      expect(result.resources.loadMode).toBe('full'); // From defaults for node
    });

    it('should use browser defaults when environment is browser', () => {
      const result = mergeWithDefaults({}, 'browser');

      expect(result.environment.environment).toBe('browser');
      expect(result.resources.loadMode).toBe('lazy'); // Browser default
      expect(result.performance.commentCollectionMaxFileSize).toBe(51200); // Browser default
    });
  });
});
