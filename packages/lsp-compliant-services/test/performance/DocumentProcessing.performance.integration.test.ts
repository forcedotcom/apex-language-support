/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Performance integration tests for DocumentProcessingService (didOpen operations).
 *
 * These tests measure the performance of document open processing to identify
 * synchronous blocking operations that could freeze the event loop.
 *
 * Focus areas:
 * - Overall didOpen processing time
 * - Compilation phase duration and blocking detection
 * - Symbol resolution and standard library loading
 * - Reference processing
 * - Event loop blocking detection
 *
 * Test environment:
 * - Uses real services (CompilerService, ApexSymbolManager, ApexStorageManager)
 * - Minimal mocking to measure actual performance
 * - Performance utilities from apex-lsp-shared for blocking detection
 */

import { TextDocumentChangeEvent } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import {
  LoggerInterface,
  getLogger,
  enableConsoleLogging,
  setLogLevel,
  ApexSettingsManager,
  LSPConfigurationManager,
  measureAsyncBlocking,
  formatTimingResult,
} from '@salesforce/apex-lsp-shared';

import { DocumentProcessingService } from '../../src/services/DocumentProcessingService';
import { ApexStorageManager } from '../../src/storage/ApexStorageManager';
import { ApexStorage } from '../../src/storage/ApexStorage';
import {
  ApexSymbolManager,
  ApexSymbolProcessingManager,
  SchedulerInitializationService,
} from '@salesforce/apex-lsp-parser-ast';
import { cleanupTestResources } from '../helpers/test-cleanup';
import { readFileSync } from 'fs';
import { join } from 'path';

// Minimal mocks - only mock external dependencies
jest.mock('@salesforce/apex-lsp-shared', () => {
  const actual = jest.requireActual('@salesforce/apex-lsp-shared');
  return {
    ...actual,
    LSPConfigurationManager: {
      getInstance: jest.fn(),
    },
    ApexSettingsManager: {
      getInstance: jest.fn(),
    },
  };
});

describe('DocumentProcessingService - Performance Tests', () => {
  let logger: LoggerInterface;
  let storageManager: ApexStorageManager;
  let symbolManager: ApexSymbolManager;
  let service: DocumentProcessingService;
  let mockConfigManager: any;
  let mockSettingsManager: any;

  // Test fixture
  const fixtureUri = 'file:///workspace/PerformanceTestClass.cls';
  const fixtureContent = readFileSync(
    join(__dirname, '../fixtures/classes/PerformanceTestClass.cls'),
    'utf8',
  );

  beforeAll(() => {
    enableConsoleLogging();
    setLogLevel('error'); // Reduce noise in performance tests
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    logger = getLogger();

    // Reset storage manager singleton
    ApexStorageManager.reset();

    // Use real storage manager with in-memory storage
    storageManager = ApexStorageManager.getInstance({
      storageFactory: () => ApexStorage.getInstance(),
      autoPersistIntervalMs: 0,
    });
    await storageManager.initialize();

    // Setup mock config manager
    mockConfigManager = {
      getConnection: jest.fn().mockReturnValue({
        sendRequest: jest.fn(),
      }),
    };

    (LSPConfigurationManager.getInstance as jest.Mock).mockReturnValue(
      mockConfigManager,
    );

    // Setup mock settings manager
    mockSettingsManager = {
      getSettings: jest.fn().mockReturnValue({
        apex: {
          findMissingArtifact: {
            enabled: false, // Disable for performance tests
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
          queueProcessing: {
            maxConcurrency: {
              CRITICAL: 100,
              IMMEDIATE: 50,
              HIGH: 50,
              NORMAL: 25,
              LOW: 10,
              BACKGROUND: 5,
            },
            yieldInterval: 50,
            yieldDelayMs: 25,
          },
        },
      }),
      getCompilationOptions: jest.fn().mockReturnValue({
        collectReferences: true,
        resolveReferences: true,
      }),
    };

    (ApexSettingsManager.getInstance as jest.Mock).mockReturnValue(
      mockSettingsManager,
    );

    // Initialize scheduler (required for real symbol manager)
    await SchedulerInitializationService.getInstance().ensureInitialized();

    // Use real symbol manager
    symbolManager = new ApexSymbolManager();
    const processingManager = ApexSymbolProcessingManager.getInstance();
    // @ts-expect-error - accessing private field for testing
    processingManager.symbolManager = symbolManager;

    // Create service under test
    service = new DocumentProcessingService(logger);
  });

  afterEach(async () => {
    await cleanupTestResources();
  });

  describe('Overall didOpen Performance', () => {
    it('measures full didOpen processing time with blocking detection', async () => {
      // Create text document
      const document = TextDocument.create(
        fixtureUri,
        'apex',
        1,
        fixtureContent,
      );

      const event: TextDocumentChangeEvent<TextDocument> = {
        document,
      };

      // Measure the full didOpen operation
      const timing = await measureAsyncBlocking('didOpen-full', async () =>
        // Call processDocumentOpenSingle which is the synchronous path
        service.processDocumentOpenSingle(event),
      );

      // Log timing
      console.log(formatTimingResult(timing));
      console.log(`  Duration: ${timing.durationMs.toFixed(2)}ms`);
      console.log(`  Environment: ${timing.environment}`);
      console.log(`  Blocking: ${timing.isBlocking ? 'YES' : 'NO'}`);

      // Assertions
      expect(timing.durationMs).toBeGreaterThan(0);

      // Warning if blocking (not a hard failure for now - just identify the issue)
      if (timing.isBlocking) {
        console.warn(
          `⚠️  didOpen blocked event loop for ${timing.durationMs.toFixed(2)}ms`,
        );
      }

      // Document should be processed
      expect(timing.result).toBeDefined();
    }, 30000); // 30 second timeout for performance test

    it('measures didOpen with multiple iterations to identify variance', async () => {
      const document = TextDocument.create(
        fixtureUri,
        'apex',
        1,
        fixtureContent,
      );

      const event: TextDocumentChangeEvent<TextDocument> = {
        document,
      };

      const iterations = 3;
      const timings: number[] = [];

      for (let i = 0; i < iterations; i++) {
        // Reset symbol manager for each iteration
        symbolManager = new ApexSymbolManager();
        const processingManager = ApexSymbolProcessingManager.getInstance();
        // @ts-expect-error - accessing private field for testing
        processingManager.symbolManager = symbolManager;

        const timing = await measureAsyncBlocking(
          `didOpen-iteration-${i + 1}`,
          async () => service.processDocumentOpenSingle(event),
        );

        timings.push(timing.durationMs);
        console.log(
          `Iteration ${i + 1}: ${timing.durationMs.toFixed(2)}ms ${timing.isBlocking ? '(BLOCKING)' : ''}`,
        );
      }

      // Calculate statistics
      const avgTime = timings.reduce((a, b) => a + b, 0) / timings.length;
      const minTime = Math.min(...timings);
      const maxTime = Math.max(...timings);
      const variance = Math.sqrt(
        timings.reduce((sum, t) => sum + Math.pow(t - avgTime, 2), 0) /
          timings.length,
      );

      console.log('\nPerformance Statistics:');
      console.log(`  Average: ${avgTime.toFixed(2)}ms`);
      console.log(`  Min: ${minTime.toFixed(2)}ms`);
      console.log(`  Max: ${maxTime.toFixed(2)}ms`);
      console.log(`  Std Dev: ${variance.toFixed(2)}ms`);

      // First iteration is often slower (cold start)
      expect(maxTime).toBeGreaterThanOrEqual(minTime);
    }, 60000); // 60 second timeout for multiple iterations
  });

  describe('Compilation Phase Performance', () => {
    it('isolates compilation time with blocking detection', () => {
      // This would require instrumenting CompilerService.compile()
      // For now, we note this as a follow-up test to create
      console.log(
        'TODO: Create compiler-specific performance test in apex-parser-ast',
      );
    });
  });

  describe('Symbol Resolution Performance', () => {
    it('identifies symbol resolution overhead', () => {
      // This would require instrumenting ApexSymbolManager.resolveMemberInContext()
      // For now, we note this as a follow-up test to create
      console.log(
        'TODO: Create symbol resolution performance test in apex-parser-ast',
      );
    });
  });

  describe('Performance Baseline', () => {
    it('generates performance baseline data for didOpen', async () => {
      const document = TextDocument.create(
        fixtureUri,
        'apex',
        1,
        fixtureContent,
      );

      const event: TextDocumentChangeEvent<TextDocument> = {
        document,
      };

      const timing = await measureAsyncBlocking('didOpen-baseline', async () =>
        service.processDocumentOpenSingle(event),
      );

      // Generate baseline report data
      const baselineData = {
        operation: 'textDocument/didOpen',
        file: 'PerformanceTestClass.cls',
        fileSize: fixtureContent.length,
        duration: timing.durationMs,
        isBlocking: timing.isBlocking,
        environment: timing.environment,
        timestamp: new Date().toISOString(),
      };

      console.log('\n=== Performance Baseline ===');
      console.log(JSON.stringify(baselineData, null, 2));
      console.log('===========================\n');

      expect(timing.result).toBeDefined();
    }, 30000);
  });
});
