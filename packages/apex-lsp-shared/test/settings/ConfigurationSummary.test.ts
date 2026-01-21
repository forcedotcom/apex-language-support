/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  generateStartupSummary,
  generateChangeSummary,
} from '../../src/settings/ConfigurationSummary';
import type { ApexLanguageServerSettings } from '../../src/server/ApexLanguageServerSettings';

describe('ConfigurationSummary', () => {
  // Helper to create a minimal valid settings object
  const createTestSettings = (
    overrides?: Partial<ApexLanguageServerSettings>,
  ): ApexLanguageServerSettings =>
    ({
      apex: {
        logLevel: 'info',
        enable: true,
        commentCollection: {
          enableCommentCollection: true,
          includeSingleLineComments: false,
          associateCommentsWithSymbols: true,
          enableForDocumentChanges: true,
          enableForDocumentOpen: true,
          enableForDocumentSymbols: false,
          enableForFoldingRanges: true,
        },
        deferredReferenceProcessing: {
          deferredBatchSize: 50,
          initialReferenceBatchSize: 25,
          maxRetryAttempts: 1,
          retryDelayMs: 100,
          maxRetryDelayMs: 5000,
          queueCapacityThreshold: 90,
          queueDrainThreshold: 75,
          queueFullRetryDelayMs: 10000,
          maxQueueFullRetryDelayMs: 30000,
          circuitBreakerFailureThreshold: 5,
          circuitBreakerResetThreshold: 50,
          maxDeferredTasksPerSecond: 5,
          yieldTimeThresholdMs: 50,
        },
        queueProcessing: {
          maxConcurrency: {
            CRITICAL: 99,
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
            HIGH: 1000,
            NORMAL: 200,
            LOW: 200,
            BACKGROUND: 200,
          },
          maxHighPriorityStreak: 50,
          idleSleepMs: 1,
        },
        findMissingArtifact: {
          enabled: true,
          maxCandidatesToOpen: 3,
          timeoutMsHint: 1500,
        },
        performance: {
          commentCollectionMaxFileSize: 102400,
          useAsyncCommentProcessing: true,
          documentChangeDebounceMs: 300,
        },
        environment: {
          serverMode: 'development',
          additionalDocumentSchemes: [],
        },
        resources: {
          loadMode: 'lazy',
        },
        trace: {
          server: 'off',
        },
        version: '1.0.0',
        worker: {
          logLevel: 'info',
          enablePerformanceLogs: false,
          logCategories: [],
        },
      },
      ...overrides,
    }) as ApexLanguageServerSettings;

  describe('generateStartupSummary', () => {
    it('should generate complete startup summary with development mode', () => {
      const settings = createTestSettings();
      const summary = generateStartupSummary(settings, 'development');

      expect(summary).toContain('Apex Language Server initialized');
      expect(summary).toContain('Server Mode: development');
      expect(summary).toContain('Log Level: info');
      expect(summary).toContain(
        'Comment Collection: enabled (associate with symbols)',
      );
      expect(summary).toContain('Deferred References: batch=50, retries=1');
      expect(summary).toContain(
        'Queue Concurrency: CRITICAL=99, HIGH=50, NORMAL=25',
      );
      expect(summary).toContain('Missing Artifact Finder: enabled');
      expect(summary).toContain('Max Comment File Size: 100KB');
      expect(summary).toContain('Document Change Debounce: 300ms');
    });

    it('should generate startup summary with production mode', () => {
      const settings = createTestSettings();
      const summary = generateStartupSummary(settings, 'production');

      expect(summary).toContain('Server Mode: production');
    });

    it('should handle disabled comment collection', () => {
      const settings = createTestSettings();
      settings.apex.commentCollection.enableCommentCollection = false;
      settings.apex.commentCollection.associateCommentsWithSymbols = false;

      const summary = generateStartupSummary(settings, 'development');

      expect(summary).toContain('Comment Collection: disabled');
      expect(summary).not.toContain('(associate with symbols)');
    });

    it('should handle disabled missing artifact finder', () => {
      const settings = createTestSettings();
      settings.apex.findMissingArtifact.enabled = false;

      const summary = generateStartupSummary(settings, 'development');

      expect(summary).toContain('Missing Artifact Finder: disabled');
    });

    it('should format file size correctly', () => {
      const settings = createTestSettings();
      settings.apex.performance.commentCollectionMaxFileSize = 204800; // 200KB

      const summary = generateStartupSummary(settings, 'development');

      expect(summary).toContain('Max Comment File Size: 200KB');
    });

    it('should handle different log levels', () => {
      const settings = createTestSettings();
      settings.apex.logLevel = 'debug';

      const summary = generateStartupSummary(settings, 'development');

      expect(summary).toContain('Log Level: debug');
    });

    it('should handle error log level', () => {
      const settings = createTestSettings();
      settings.apex.logLevel = 'error';

      const summary = generateStartupSummary(settings, 'development');

      expect(summary).toContain('Log Level: error');
    });

    it('should handle undefined deferredReferenceProcessing gracefully', () => {
      const settings = createTestSettings();
      settings.apex.deferredReferenceProcessing = undefined as any;

      const summary = generateStartupSummary(settings, 'development');

      expect(summary).toContain('Apex Language Server initialized');
      expect(summary).not.toContain('Deferred References');
    });
  });

  describe('generateChangeSummary', () => {
    it('should show no changes when settings are identical', () => {
      const settings = createTestSettings();
      const summary = generateChangeSummary(settings, settings);

      expect(summary).toContain('Configuration updated');
      expect(summary).toContain('(settings synchronized)');
    });

    it('should detect log level change', () => {
      const previous = createTestSettings();
      const current = createTestSettings();
      current.apex.logLevel = 'debug';

      const summary = generateChangeSummary(previous, current);

      expect(summary).toContain('Configuration updated');
      expect(summary).toContain('Log Level: info → debug');
      expect(summary).not.toContain('(settings synchronized)');
    });

    it('should detect comment collection enable change', () => {
      const previous = createTestSettings();
      previous.apex.commentCollection.enableCommentCollection = false;
      const current = createTestSettings();
      current.apex.commentCollection.enableCommentCollection = true;

      const summary = generateChangeSummary(previous, current);

      expect(summary).toContain('Comment Collection: disabled → enabled');
    });

    it('should detect comment association change', () => {
      const previous = createTestSettings();
      previous.apex.commentCollection.associateCommentsWithSymbols = false;
      const current = createTestSettings();
      current.apex.commentCollection.associateCommentsWithSymbols = true;

      const summary = generateChangeSummary(previous, current);

      expect(summary).toContain('Associate Comments: off → on');
    });

    it('should detect deferred batch size change', () => {
      const previous = createTestSettings();
      previous.apex.deferredReferenceProcessing!.deferredBatchSize = 10;
      const current = createTestSettings();
      current.apex.deferredReferenceProcessing!.deferredBatchSize = 50;

      const summary = generateChangeSummary(previous, current);

      expect(summary).toContain('Deferred Batch Size: 10 → 50');
    });

    it('should detect max retry attempts change', () => {
      const previous = createTestSettings();
      previous.apex.deferredReferenceProcessing!.maxRetryAttempts = 1;
      const current = createTestSettings();
      current.apex.deferredReferenceProcessing!.maxRetryAttempts = 5;

      const summary = generateChangeSummary(previous, current);

      expect(summary).toContain('Max Retry Attempts: 1 → 5');
    });

    it('should detect queue concurrency changes', () => {
      const previous = createTestSettings();
      previous.apex.queueProcessing.maxConcurrency.CRITICAL = 50;
      const current = createTestSettings();
      current.apex.queueProcessing.maxConcurrency.CRITICAL = 99;

      const summary = generateChangeSummary(previous, current);

      expect(summary).toContain('Queue CRITICAL Concurrency: 50 → 99');
    });

    it('should detect missing artifact finder change', () => {
      const previous = createTestSettings();
      previous.apex.findMissingArtifact.enabled = false;
      const current = createTestSettings();
      current.apex.findMissingArtifact.enabled = true;

      const summary = generateChangeSummary(previous, current);

      expect(summary).toContain('Missing Artifact Finder: disabled → enabled');
    });

    it('should detect performance setting changes', () => {
      const previous = createTestSettings();
      previous.apex.performance.commentCollectionMaxFileSize = 51200; // 50KB
      const current = createTestSettings();
      current.apex.performance.commentCollectionMaxFileSize = 102400; // 100KB

      const summary = generateChangeSummary(previous, current);

      expect(summary).toContain('Max Comment File Size: 50KB → 100KB');
    });

    it('should detect document change debounce changes', () => {
      const previous = createTestSettings();
      previous.apex.performance.documentChangeDebounceMs = 100;
      const current = createTestSettings();
      current.apex.performance.documentChangeDebounceMs = 300;

      const summary = generateChangeSummary(previous, current);

      expect(summary).toContain('Document Change Debounce: 100ms → 300ms');
    });

    it('should detect multiple changes at once', () => {
      const previous = createTestSettings();
      previous.apex.logLevel = 'info';
      previous.apex.commentCollection.enableCommentCollection = false;
      previous.apex.deferredReferenceProcessing!.deferredBatchSize = 10;

      const current = createTestSettings();
      current.apex.logLevel = 'debug';
      current.apex.commentCollection.enableCommentCollection = true;
      current.apex.deferredReferenceProcessing!.deferredBatchSize = 50;

      const summary = generateChangeSummary(previous, current);

      expect(summary).toContain('Log Level: info → debug');
      expect(summary).toContain('Comment Collection: disabled → enabled');
      expect(summary).toContain('Deferred Batch Size: 10 → 50');
      expect(summary).not.toContain('(settings synchronized)');
    });

    it('should handle undefined deferredReferenceProcessing gracefully', () => {
      const previous = createTestSettings();
      previous.apex.deferredReferenceProcessing = undefined as any;
      const current = createTestSettings();
      current.apex.deferredReferenceProcessing = undefined as any;

      const summary = generateChangeSummary(previous, current);

      expect(summary).toContain('Configuration updated');
      // Should not crash, should show synchronized
      expect(summary).toContain('(settings synchronized)');
    });
  });
});
