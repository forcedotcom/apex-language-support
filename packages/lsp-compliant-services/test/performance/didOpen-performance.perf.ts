/*
 * Copyright (c) 2025, salesforce.com, inc.
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

import Benchmark from 'benchmark';
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
  const benchmarkSettings = isCI
    ? { maxTime: 30, minTime: 10, minSamples: 5, initCount: 1 }
    : isQuick
      ? { maxTime: 1, minTime: 0.1, minSamples: 1, initCount: 1 }
      : { maxTime: 6, minTime: 2, minSamples: 2, initCount: 1 };

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
    it(
      `benchmarks ${fixture.complexity} complexity (${fixture.name})`,
      () =>
        new Promise<void>((done) => {
          const suite = new Benchmark.Suite();
          const results: Record<string, Benchmark.Target> = {};

          const content = readFileSync(join(__dirname, fixture.path), 'utf8');
          const document = TextDocument.create(fixture.uri, 'apex', 1, content);
          const event: TextDocumentChangeEvent<TextDocument> = { document };

          suite
            .add(`didOpen ${fixture.complexity}`, {
              defer: true,
              ...benchmarkSettings,
              fn: (deferred: any) => {
                service
                  .processDocumentOpenInternal(event)
                  .then(() => deferred.resolve())
                  .catch((err: any) => {
                    console.error(`Error in ${fixture.name}:`, err);
                    deferred.resolve();
                  });
              },
            })
            .on('cycle', (event: any) => {
              results[event.target.name] = event.target;
              logger.alwaysLog(String(event.target));
            })
            .on('complete', function (this: any) {
              const fs = require('fs');
              const path = require('path');
              const outputPath = path.join(
                __dirname,
                '../lsp-compliant-services-benchmark-results.json',
              );

              // Merge with existing results if file exists
              let allResults = results;
              try {
                if (fs.existsSync(outputPath)) {
                  const existing = JSON.parse(
                    fs.readFileSync(outputPath, 'utf8'),
                  );
                  allResults = { ...existing, ...results };
                }
              } catch (error) {
                console.warn('Could not read existing results:', error);
              }

              fs.writeFileSync(outputPath, JSON.stringify(allResults, null, 2));
              done();
            })
            .run({ async: true });
        }),
      120000,
    );
  });

  // Variance Analysis Benchmark
  it(
    'benchmarks didOpen variance across iterations',
    () =>
      new Promise<void>((done) => {
        const suite = new Benchmark.Suite();
        const results: Record<string, Benchmark.Target> = {};

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

        suite
          .add('didOpen variance test', {
            defer: true,
            ...benchmarkSettings,
            fn: (deferred: any) => {
              // Reset symbol manager for each iteration to measure cold start
              const newSymbolManager = new ApexSymbolManager();
              const processingManager =
                ApexSymbolProcessingManager.getInstance();
              // @ts-expect-error - accessing private field for testing
              processingManager.symbolManager = newSymbolManager;

              service
                .processDocumentOpenInternal(event)
                .then(() => deferred.resolve())
                .catch((err: any) => {
                  console.error('Error in variance test:', err);
                  deferred.resolve();
                });
            },
          })
          .on('cycle', (event: any) => {
            results[event.target.name] = event.target;
            logger.alwaysLog(String(event.target));
          })
          .on('complete', function (this: any) {
            const fs = require('fs');
            const path = require('path');
            const outputPath = path.join(
              __dirname,
              '../lsp-compliant-services-benchmark-results.json',
            );

            // Merge with existing results
            let allResults = results;
            try {
              if (fs.existsSync(outputPath)) {
                const existing = JSON.parse(
                  fs.readFileSync(outputPath, 'utf8'),
                );
                allResults = { ...existing, ...results };
              }
            } catch (error) {
              console.warn('Could not read existing results:', error);
            }

            fs.writeFileSync(outputPath, JSON.stringify(allResults, null, 2));
            done();
          })
          .run({ async: true });
      }),
    120000,
  );

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

    const timing = await measureAsyncBlocking('didOpen-blocking', async () =>
      service.processDocumentOpenInternal(event),
    );

    logger.info('\n=== Blocking Detection ===');
    logger.info(`Duration: ${timing.durationMs.toFixed(2)}ms`);
    logger.info(`Blocking: ${timing.isBlocking ? 'YES ⚠️' : 'NO ✓'}`);
    logger.info(`Environment: ${timing.environment}`);

    if (timing.isBlocking) {
      logger.warn(
        `⚠️ didOpen blocked event loop for ${timing.durationMs.toFixed(2)}ms`,
      );
    }

    // Informational only - no assertion
    expect(timing.result).toBeDefined();
  }, 30000);
});
