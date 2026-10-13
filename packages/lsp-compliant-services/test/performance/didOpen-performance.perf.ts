/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { Mock } from 'vitest';
import { vi } from 'vitest';
/**
 * didOpen Performance Benchmarks - Complexity Scaling & Blocking Analysis
 *
 * This benchmark suite measures didOpen performance across different dimensions:
 * 1. Complexity scaling (Minimal → Small → Medium → Large test classes)
 * 2. Variance analysis across multiple iterations
 * 3. Event loop blocking detection
 *
 * Purpose:
 * - Establish baseline measurements for build-to-build regression detection
 * - Identify synchronous blocking operations that could freeze the event loop
 * - Track performance trends over time via CI
 *
 * Merged from:
 * - BenchmarkSuite.performance.test.ts (complexity scaling)
 * - DocumentProcessing.performance.integration.test.ts (blocking detection)
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
vi.mock('@salesforce/apex-lsp-shared', async () => {
  const actual = await vi.importActual('@salesforce/apex-lsp-shared');
  return {
    ...actual,
    LSPConfigurationManager: {
      getInstance: vi.fn(),
    },
    ApexSettingsManager: {
      getInstance: vi.fn(),
    },
  };
});

describe('didOpen Performance Benchmarks', () => {
  let logger: LoggerInterface;
  let storageManager: ApexStorageManager;
  let symbolManager: ApexSymbolManager;
  let service: DocumentProcessingService;
  let mockConfigManager: any;
  let mockSettingsManager: any;

  const isCI = process.env.CI === 'true';
  const isQuick = process.env.QUICK === 'true';
  const benchmarkOptions = isCI
    ? { time: 30_000, warmupTime: 10_000, iterations: 5, warmupIterations: 1 }
    : isQuick
      ? { time: 1_000, warmupTime: 100, iterations: 1, warmupIterations: 1 }
      : { time: 6_000, warmupTime: 2_000, iterations: 2, warmupIterations: 1 };

  // Test fixtures for complexity scaling
  const fixtures = [
    {
      name: 'MinimalTestClass',
      complexity: 'Minimal',
      uri: 'file:///workspace/MinimalTestClass.cls',
      path: '../fixtures/classes/MinimalTestClass.cls',
    },
    {
      name: 'SmallTestClass',
      complexity: 'Small',
      uri: 'file:///workspace/SmallTestClass.cls',
      path: '../fixtures/classes/SmallTestClass.cls',
    },
    {
      name: 'MediumTestClass',
      complexity: 'Medium',
      uri: 'file:///workspace/MediumTestClass.cls',
      path: '../fixtures/classes/MediumTestClass.cls',
    },
    {
      name: 'LargeTestClass',
      complexity: 'Large',
      uri: 'file:///workspace/LargeTestClass.cls',
      path: '../fixtures/classes/LargeTestClass.cls',
    },
  ];

  beforeAll(async () => {
    enableConsoleLogging();
    setLogLevel('error');

    const resourceLoader = ResourceLoader.getInstance();
    await resourceLoader.initialize();
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    logger = getLogger();

    ApexStorageManager.reset();
    storageManager = ApexStorageManager.getInstance({
      storageFactory: () => ApexStorage.getInstance(),
      autoPersistIntervalMs: 0,
    });
    await storageManager.initialize();

    mockConfigManager = {
      getConnection: vi.fn().mockReturnValue({
        sendRequest: vi.fn(),
      }),
    };
    (LSPConfigurationManager.getInstance as Mock).mockReturnValue(
      mockConfigManager,
    );

    mockSettingsManager = {
      getSettings: vi.fn().mockReturnValue({
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
      getCompilationOptions: vi.fn().mockReturnValue({
        collectReferences: true,
        resolveReferences: true,
      }),
    };
    (ApexSettingsManager.getInstance as Mock).mockReturnValue(
      mockSettingsManager,
    );

    await SchedulerInitializationService.getInstance().ensureInitialized();

    symbolManager = new ApexSymbolManager();
    const processingManager = ApexSymbolProcessingManager.getInstance();
    // @ts-expect-error - accessing private field for testing
    processingManager.symbolManager = symbolManager;

    service = new DocumentProcessingService(logger);
  });

  afterEach(async () => {
    await cleanupTestResources();
  });

  afterAll(async () => {
    await cleanupTestResources();
  });

  // Complexity Scaling Benchmarks
  fixtures.forEach((fixture) => {
    it(`benchmarks ${fixture.complexity} complexity (${fixture.name})`, async ({
      bench,
    }) => {
      const content = readFileSync(join(__dirname, fixture.path), 'utf8');
      const document = TextDocument.create(fixture.uri, 'apex', 1, content);
      const event: TextDocumentChangeEvent<TextDocument> = { document };

      await bench(`didOpen ${fixture.complexity}`, {}, () =>
        service.processDocumentOpenInternal(event),
      ).run(benchmarkOptions);
    }, 120000);
  });

  // Variance Analysis Benchmark
  it('benchmarks didOpen variance across iterations', async ({ bench }) => {
    const fixtureContent = readFileSync(
      join(__dirname, '../fixtures/classes/PerformanceTestClass.cls'),
      'utf8',
    );
    const document = TextDocument.create(
      'file:///workspace/PerformanceTestClass.cls',
      'apex',
      1,
      fixtureContent,
    );
    const event: TextDocumentChangeEvent<TextDocument> = { document };

    await bench('didOpen variance test', {}, async () => {
      // Reset symbol manager for each iteration to measure cold start
      const newSymbolManager = new ApexSymbolManager();
      const processingManager = ApexSymbolProcessingManager.getInstance();
      // @ts-expect-error - accessing private field for testing
      processingManager.symbolManager = newSymbolManager;

      await service.processDocumentOpenInternal(event);
    }).run(benchmarkOptions);
  }, 120000);

  // Blocking Detection (informational)
  it('detects event loop blocking during didOpen', async () => {
    const fixtureContent = readFileSync(
      join(__dirname, '../fixtures/classes/PerformanceTestClass.cls'),
      'utf8',
    );
    const document = TextDocument.create(
      'file:///workspace/PerformanceTestClass.cls',
      'apex',
      1,
      fixtureContent,
    );
    const event: TextDocumentChangeEvent<TextDocument> = { document };

    const start = performance.now();
    const result = await service.processDocumentOpenInternal(event);
    const durationMs = performance.now() - start;
    const isBlocking = durationMs > 100;

    logger.info('\n=== Blocking Detection ===');
    logger.info(`Duration: ${durationMs.toFixed(2)}ms`);
    logger.info(`Blocking: ${isBlocking ? 'YES ⚠️' : 'NO ✓'}`);
    logger.info('Environment: node');

    if (isBlocking) {
      logger.warn(
        `⚠️ didOpen blocked event loop for ${durationMs.toFixed(2)}ms`,
      );
    }

    // Informational only - no assertion
    expect(result).toBeDefined();
  }, 30000);
});
