/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Performance Benchmark Suite - Complexity Scaling
 *
 * This test suite measures didOpen performance across different complexity levels
 * to establish baseline measurements for build-to-build comparison.
 *
 * Test fixtures:
 * - MinimalTestClass: String only (~40-60ms expected)
 * - SmallTestClass: String, Integer, Boolean, System (~60-80ms expected)
 * - MediumTestClass: Collections (List, Map) (~100-120ms expected)
 * - LargeTestClass: Complex types (Database, Schema, etc.) (~200-250ms expected)
 *
 * Purpose:
 * - Establish baseline measurements across complexity levels
 * - Enable build-to-build performance regression detection
 * - Provide concrete data points for optimization validation
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
} from '@salesforce/apex-lsp-shared';

import { DocumentProcessingService } from '../../src/services/DocumentProcessingService';
import { ApexStorageManager } from '../../src/storage/ApexStorageManager';
import { ApexStorage } from '../../src/storage/ApexStorage';
import {
  ApexSymbolManager,
  ApexSymbolProcessingManager,
  SchedulerInitializationService,
  ResourceLoader,
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

interface BenchmarkResult {
  className: string;
  complexity: string;
  firstOpen: number;
  secondOpen: number;
  thirdOpen: number;
  avgSubsequent: number;
  penalty: number;
  penaltyPercent: number;
  firstBlocking: boolean;
}

describe('Benchmark Suite - Complexity Scaling', () => {
  let logger: LoggerInterface;
  let storageManager: ApexStorageManager;
  let symbolManager: ApexSymbolManager;
  let service: DocumentProcessingService;
  let mockConfigManager: any;
  let mockSettingsManager: any;

  const benchmarkResults: BenchmarkResult[] = [];

  // Test fixtures
  const fixtures = [
    {
      name: 'MinimalTestClass',
      complexity: 'Minimal',
      uri: 'file:///workspace/MinimalTestClass.cls',
      path: '../fixtures/classes/MinimalTestClass.cls',
      expectedStdlibClasses: 1,
      expectedRange: '40-60ms',
    },
    {
      name: 'SmallTestClass',
      complexity: 'Small',
      uri: 'file:///workspace/SmallTestClass.cls',
      path: '../fixtures/classes/SmallTestClass.cls',
      expectedStdlibClasses: 4,
      expectedRange: '60-80ms',
    },
    {
      name: 'MediumTestClass',
      complexity: 'Medium',
      uri: 'file:///workspace/MediumTestClass.cls',
      path: '../fixtures/classes/MediumTestClass.cls',
      expectedStdlibClasses: 7,
      expectedRange: '100-120ms',
    },
    {
      name: 'LargeTestClass',
      complexity: 'Large',
      uri: 'file:///workspace/LargeTestClass.cls',
      path: '../fixtures/classes/LargeTestClass.cls',
      expectedStdlibClasses: 15,
      expectedRange: '200-250ms',
    },
  ];

  beforeAll(async () => {
    enableConsoleLogging();
    setLogLevel('info');

    // Initialize ResourceLoader with protobuf cache BEFORE any tests run
    const tempLogger = getLogger();
    tempLogger.info(
      '\n=== Initializing ResourceLoader for Benchmark Suite ===',
    );
    const resourceLoader = ResourceLoader.getInstance({
      preloadStdClasses: true,
    });
    await resourceLoader.initialize();

    const isProtobufLoaded = resourceLoader.isProtobufCacheLoaded();
    tempLogger.info(`✅ Protobuf cache loaded: ${isProtobufLoaded}`);
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    logger = getLogger();

    ApexStorageManager.reset();
    storageManager = ApexStorageManager.getInstance({
      storageFactory: () => ApexStorage.getInstance(),
      autoPersistIntervalMs: 0,
    });
    await storageManager.initialize();

    mockConfigManager = {
      getConnection: jest.fn().mockReturnValue({
        sendRequest: jest.fn(),
      }),
    };
    (LSPConfigurationManager.getInstance as jest.Mock).mockReturnValue(
      mockConfigManager,
    );

    mockSettingsManager = {
      getSettings: jest.fn().mockReturnValue({
        apex: {
          findMissingArtifact: { enabled: false },
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

    await SchedulerInitializationService.getInstance().ensureInitialized();

    // Create NEW symbol manager for each test (fresh symbol graph)
    symbolManager = new ApexSymbolManager();
    const processingManager = ApexSymbolProcessingManager.getInstance();
    // @ts-expect-error - accessing private field for testing
    processingManager.symbolManager = symbolManager;

    service = new DocumentProcessingService(logger);
  });

  afterEach(async () => {
    await cleanupTestResources();
  });

  afterAll(() => {
    // Print summary of all benchmark results
    logger.info('\n\n=== BENCHMARK SUITE SUMMARY ===\n');
    logger.info(
      '| Complexity | First Open | Avg Subsequent | Penalty | % Penalty | Blocking |',
    );
    logger.info(
      '|------------|------------|----------------|---------|-----------|----------|',
    );

    for (const result of benchmarkResults) {
      logger.info(
        `| ${result.complexity.padEnd(10)} | ` +
          `${result.firstOpen.toFixed(2).padStart(10)}ms | ` +
          `${result.avgSubsequent.toFixed(2).padStart(14)}ms | ` +
          `${result.penalty.toFixed(2).padStart(7)}ms | ` +
          `${result.penaltyPercent.toFixed(1).padStart(9)}% | ` +
          `${result.firstBlocking ? 'YES ⚠️' : 'NO ✓'.padEnd(9)} |`,
      );
    }
    logger.info('\n=== END BENCHMARK SUITE ===\n');
  });

  // Test each complexity level
  fixtures.forEach((fixture) => {
    it(`measures ${fixture.complexity} complexity (${fixture.name}) - expected ${fixture.expectedRange}`, async () => {
      logger.info(
        `\n=== Testing ${fixture.complexity} Complexity: ${fixture.name} ===`,
      );
      logger.info(`Expected stdlib classes: ~${fixture.expectedStdlibClasses}`);
      logger.info(`Expected first open: ${fixture.expectedRange}\n`);

      const content = readFileSync(join(__dirname, fixture.path), 'utf8');
      const document = TextDocument.create(fixture.uri, 'apex', 1, content);
      const event: TextDocumentChangeEvent<TextDocument> = { document };

      const iterations = 3;
      const timings: Array<{ duration: number; isBlocking: boolean }> = [];

      // Measure first open and 2 subsequent opens
      for (let i = 0; i < iterations; i++) {
        const timing = await measureAsyncBlocking(
          `${fixture.name}-iteration-${i + 1}`,
          async () => service.processDocumentOpenSingle(event),
        );

        timings.push({
          duration: timing.durationMs,
          isBlocking: timing.isBlocking,
        });

        logger.info(
          `  Iteration ${i + 1}: ${timing.durationMs.toFixed(2)}ms ` +
            `${timing.isBlocking ? '(BLOCKING ⚠️)' : '(non-blocking ✓)'}`,
        );
      }

      // Analyze results
      const [first, second, third] = timings;
      const avgSubsequent = (second.duration + third.duration) / 2;
      const penalty = first.duration - avgSubsequent;
      const penaltyPercent = (penalty / first.duration) * 100;

      logger.info('\n  Results:');
      logger.info(`    First open:      ${first.duration.toFixed(2)}ms`);
      logger.info(`    Avg subsequent:  ${avgSubsequent.toFixed(2)}ms`);
      logger.info(
        `    Penalty:         ${penalty.toFixed(2)}ms (${penaltyPercent.toFixed(1)}%)`,
      );
      logger.info(
        `    First blocking:  ${first.isBlocking ? 'YES ⚠️' : 'NO ✓'}`,
      );

      // Store results for summary
      benchmarkResults.push({
        className: fixture.name,
        complexity: fixture.complexity,
        firstOpen: first.duration,
        secondOpen: second.duration,
        thirdOpen: third.duration,
        avgSubsequent,
        penalty,
        penaltyPercent,
        firstBlocking: first.isBlocking,
      });

      // Assertions
      expect(first.duration).toBeGreaterThan(0);
      expect(avgSubsequent).toBeGreaterThan(0);
      expect(penalty).toBeGreaterThanOrEqual(0);

      // Subsequent opens should be significantly faster
      expect(avgSubsequent).toBeLessThan(first.duration * 0.7);
    }, 60000);
  });
});
