/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  getDefaultSchemesForCapability,
  getDocumentSelectorsForCapability,
  getDocumentSelectorsFromSettings,
  getDefaultDocumentSelectors,
  getAllImmutableSchemes,
  validateAdditionalDocumentSchemes,
  DEFAULT_SCHEMES_FOR_MOST,
  DEFAULT_SCHEMES_FOR_CODELENS,
  DEFAULT_LANGUAGES,
} from '../../src/document/DocumentSelectorUtils';
import type { ApexLanguageServerSettings } from '../../src/server/ApexLanguageServerSettings';
import { getLogger } from '../../src/logger';

describe('DocumentSelectorUtils', () => {
  describe('getAllImmutableSchemes', () => {
    it('should return all immutable schemes', () => {
      const schemes = getAllImmutableSchemes();
      expect(schemes).toContain('file');
      expect(schemes).toContain('apexlib');
      expect(schemes).toContain('vscode-test-web');
      expect(schemes.length).toBe(3);
    });
  });

  describe('getDefaultSchemesForCapability', () => {
    it('should return correct schemes for most capabilities', () => {
      const schemes = getDefaultSchemesForCapability('documentSymbol');
      expect(schemes).toEqual(DEFAULT_SCHEMES_FOR_MOST);
      expect(schemes).toContain('file');
      expect(schemes).toContain('apexlib');
      expect(schemes).toContain('vscode-test-web');
    });

    it('should return correct schemes for codeLens (excludes apexlib)', () => {
      const schemes = getDefaultSchemesForCapability('codeLens');
      expect(schemes).toEqual(DEFAULT_SCHEMES_FOR_CODELENS);
      expect(schemes).toContain('file');
      expect(schemes).toContain('vscode-test-web');
      expect(schemes).not.toContain('apexlib');
    });

    it('should return all schemes for "all" capability', () => {
      const schemes = getDefaultSchemesForCapability('all');
      expect(schemes).toContain('file');
      expect(schemes).toContain('apexlib');
      expect(schemes).toContain('vscode-test-web');
    });
  });

  describe('getDocumentSelectorsForCapability', () => {
    it('should return default selectors for most capabilities', () => {
      const selectors = getDocumentSelectorsForCapability('documentSymbol');
      expect(selectors.length).toBe(
        DEFAULT_SCHEMES_FOR_MOST.length * DEFAULT_LANGUAGES.length,
      );
      expect(selectors).toContainEqual({ scheme: 'file', language: 'apex' });
      expect(selectors).toContainEqual({
        scheme: 'file',
        language: 'apex-anon',
      });
      expect(selectors).toContainEqual({ scheme: 'apexlib', language: 'apex' });
    });

    it('should exclude apexlib for codeLens', () => {
      const selectors = getDocumentSelectorsForCapability('codeLens');
      expect(selectors).toContainEqual({ scheme: 'file', language: 'apex' });
      expect(selectors).not.toContainEqual({
        scheme: 'apexlib',
        language: 'apex',
      });
    });

    it('should add additional schemes when provided', () => {
      const selectors = getDocumentSelectorsForCapability('documentSymbol', [
        { scheme: 'custom-scheme' },
      ]);
      expect(selectors).toContainEqual({
        scheme: 'custom-scheme',
        language: 'apex',
      });
      expect(selectors).toContainEqual({
        scheme: 'custom-scheme',
        language: 'apex-anon',
      });
    });

    it('should exclude additional schemes from specified capabilities', () => {
      const selectors = getDocumentSelectorsForCapability('codeLens', [
        { scheme: 'custom-scheme', excludeCapabilities: ['codeLens'] },
      ]);
      expect(selectors).not.toContainEqual({
        scheme: 'custom-scheme',
        language: 'apex',
      });
    });

    it('should warn and skip immutable schemes when added as additional', () => {
      const logger = getLogger();
      const warnSpy = jest.spyOn(logger, 'warn');

      const selectors = getDocumentSelectorsForCapability('documentSymbol', [
        { scheme: 'file' }, // immutable scheme
      ]);

      // Should still include 'file' from defaults
      expect(selectors).toContainEqual({ scheme: 'file', language: 'apex' });
      // Should have warned
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('should warn when trying to exclude immutable scheme', () => {
      const logger = getLogger();
      const warnSpy = jest.spyOn(logger, 'warn');

      const selectors = getDocumentSelectorsForCapability('documentSymbol', [
        { scheme: 'file', excludeCapabilities: ['documentSymbol'] },
      ]);

      // Should still include 'file' from defaults (cannot be excluded)
      expect(selectors).toContainEqual({ scheme: 'file', language: 'apex' });
      // Should have warned about exclusion attempt
      expect(warnSpy).toHaveBeenCalledWith(expect.any(Function));
      const warnCall = warnSpy.mock.calls.find((call) =>
        call[0]().includes('Cannot exclude immutable scheme'),
      );
      expect(warnCall).toBeDefined();
      warnSpy.mockRestore();
    });
  });

  describe('validateAdditionalDocumentSchemes', () => {
    it('should return valid for empty array', () => {
      const result = validateAdditionalDocumentSchemes([]);
      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it('should return valid for undefined', () => {
      const result = validateAdditionalDocumentSchemes(undefined);
      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it('should warn when trying to add immutable scheme', () => {
      const logger = getLogger();
      const warnSpy = jest.spyOn(logger, 'warn');

      const result = validateAdditionalDocumentSchemes([{ scheme: 'file' }]);

      expect(result.isValid).toBe(false);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('should warn when trying to exclude immutable scheme', () => {
      const logger = getLogger();
      const warnSpy = jest.spyOn(logger, 'warn');

      const result = validateAdditionalDocumentSchemes([
        { scheme: 'apexlib', excludeCapabilities: ['codeLens'] },
      ]);

      expect(result.isValid).toBe(false);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('Cannot exclude immutable scheme');
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('should accept valid additional schemes', () => {
      const result = validateAdditionalDocumentSchemes([
        { scheme: 'custom-scheme' },
        { scheme: 'another-scheme', excludeCapabilities: ['codeLens'] },
      ]);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe('getDocumentSelectorsFromSettings', () => {
    it('should return default selectors when settings are undefined', () => {
      const selectors = getDocumentSelectorsFromSettings('documentSymbol');
      expect(selectors.length).toBe(
        DEFAULT_SCHEMES_FOR_MOST.length * DEFAULT_LANGUAGES.length,
      );
    });

    it('should include additional schemes from settings', () => {
      const settings: ApexLanguageServerSettings = {
        apex: {
          environment: {
            runtimePlatform: 'desktop',
            serverMode: 'production',
            profilingMode: 'none',
            profilingType: 'cpu',
            commentCollectionLogLevel: 'info',
            additionalDocumentSchemes: [{ scheme: 'custom-scheme' }],
          },
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
          resources: {},
          findMissingArtifact: {
            enabled: false,
            blockingWaitTimeoutMs: 2000,
            indexingBarrierPollMs: 100,
            maxCandidatesToOpen: 3,
            timeoutMsHint: 1500,
            enablePerfMarks: false,
          },
          loadWorkspace: {
            enabled: false,
            maxConcurrency: 50,
            yieldInterval: 50,
            yieldDelayMs: 10,
          },
          queueProcessing: {
            maxConcurrency: {},
            yieldInterval: 50,
            yieldDelayMs: 10,
          },
          scheduler: {
            queueCapacity: 100,
            maxHighPriorityStreak: 50,
            idleSleepMs: 1,
          },
        },
      };

      const selectors = getDocumentSelectorsFromSettings(
        'documentSymbol',
        settings,
      );
      expect(selectors).toContainEqual({
        scheme: 'custom-scheme',
        language: 'apex',
      });
    });
  });

  describe('getDefaultDocumentSelectors', () => {
    it('should return default selectors for all capabilities when no capability specified', () => {
      const selectors = getDefaultDocumentSelectors();
      expect(selectors.length).toBeGreaterThan(0);
    });

    it('should return default selectors for specific capability', () => {
      const selectors = getDefaultDocumentSelectors('codeLens');
      expect(selectors).not.toContainEqual({
        scheme: 'apexlib',
        language: 'apex',
      });
    });
  });
});
