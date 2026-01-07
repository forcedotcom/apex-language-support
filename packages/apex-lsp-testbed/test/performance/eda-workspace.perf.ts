/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as fs from 'fs';
import * as path from 'path';
import Benchmark from 'benchmark';
import { disableLogging } from '@salesforce/apex-lsp-shared';
import {
  CompilerService,
  ApexSymbolCollectorListener,
  PublicAPISymbolListener,
  ProtectedSymbolListener,
  PrivateSymbolListener,
  SymbolTable,
  type CompilationResult,
} from '@salesforce/apex-lsp-parser-ast';
import { Effect } from 'effect';
import {
  measureMemoryUsage,
  trackCompilationMetrics,
  findApexFiles,
  checkEDARepositoryExists,
  ensureEDARepository,
  generatePerformanceReport,
  calculateMemoryGrowth,
  findPeakMemory,
  measureManagerAdditionCost,
  type MemorySnapshot,
  type PerformanceMetrics,
  type FileCompilationMetrics,
  type ManagerAdditionMetrics,
} from './eda-performance-helpers';

/**
 * Test configuration
 */
interface TestConfig {
  /** Skip test if EDA repo not available */
  skipIfMissing: boolean;
  /** Limit number of files to process (for quick tests) */
  maxFiles?: number;
  /** Enable per-file timing (adds overhead) */
  perFileTiming: boolean;
  /** Batch size for compilation */
  batchSize: number;
  /** Output JSON report */
  outputJson: boolean;
}

const DEFAULT_CONFIG: TestConfig = {
  skipIfMissing: true,
  perFileTiming: true,
  batchSize: 50,
  outputJson: false,
};

/**
 * EDA Workspace Performance Tests
 *
 * These tests measure CPU and memory cost when loading the EDA workspace,
 * simulating LSP startup behavior. EDA is a large, real-world Salesforce codebase
 * (88% Apex) that provides an excellent test case for measuring listener compilation costs.
 *
 * IMPORTANT: Debug logging is disabled for these tests to ensure accurate
 * performance measurements.
 *
 * The test will automatically clone the EDA repository on first run.
 *
 * Usage:
 *   npm run test:perf:eda              # Run full benchmarks
 *   QUICK=true npm run test:perf:eda   # Quick validation (10 files, 1 sample per batch)
 *   CI=true npm run test:perf:eda      # Comprehensive CI benchmarks
 */
describe('EDA Workspace Performance Tests', () => {
  let compilerService: CompilerService;
  const EDA_REPO_PATH = path.join(__dirname, '../fixtures/eda');
  const EDA_FORCE_APP_PATH = path.join(EDA_REPO_PATH, 'force-app');
  const EDA_REPO_URL = 'https://github.com/mshanemc/EDA.git';

  beforeAll(() => {
    // Disable logging for performance tests
    disableLogging();

    // Ensure EDA repository exists (clone if necessary)
    try {
      ensureEDARepository(EDA_REPO_PATH, EDA_REPO_URL, true);
    } catch (error) {
      console.error(
        `Failed to setup EDA repository: ${error instanceof Error ? error.message : String(error)}`,
      );
      console.error('Tests will be skipped if repository is not available.');
    }
  });

  beforeEach(() => {
    compilerService = new CompilerService();
  });

  describe('Baseline Memory Test', () => {
    it('should measure baseline memory consumption', () => {
      const baseline = measureMemoryUsage();
      console.log('\n=== BASELINE MEMORY ===');
      console.log(`Heap Used: ${baseline.heapUsedMB}MB`);
      console.log(`Heap Total: ${baseline.heapTotalMB}MB`);
      console.log(`RSS: ${baseline.rssMB}MB`);
      console.log(`External: ${baseline.externalMB}MB`);

      expect(baseline.heapUsedMB).toBeGreaterThan(0);
    });
  });

  describe('Full Workspace Load', () => {
    const config: TestConfig = {
      ...DEFAULT_CONFIG,
      // In quick mode, limit files and reduce batch size for faster validation
      maxFiles: process.env.QUICK === 'true' ? 10 : undefined,
      batchSize: process.env.QUICK === 'true' ? 10 : DEFAULT_CONFIG.batchSize,
    };

    it(
      'should compile all EDA files and measure performance',
      async () => {
        // Skip if repository not available
        if (!checkEDARepositoryExists(EDA_REPO_PATH)) {
          console.log('Skipping test: EDA repository not found');
          return;
        }

        // Find all Apex files
        console.log(`\n📁 Discovering Apex files in ${EDA_FORCE_APP_PATH}...`);
        const apexFiles = findApexFiles(EDA_FORCE_APP_PATH, config.maxFiles);
        console.log(`Found ${apexFiles.length} Apex files`);

        if (apexFiles.length === 0) {
          console.warn('No Apex files found in EDA repository');
          return;
        }

        // Initial memory measurement
        const initialMemory = measureMemoryUsage();
        const memorySnapshots: MemorySnapshot[] = [initialMemory];

        // Read all file contents
        console.log('\n📖 Reading file contents...');
        const fileContents = apexFiles.map((file) => {
          const content = fs.readFileSync(file.filePath, 'utf8');
          const stats = fs.statSync(file.filePath);
          return {
            content,
            fileName: file.relativePath,
            filePath: file.filePath,
            size: stats.size,
          };
        });

        // Prepare compilation configs
        console.log('\n🔨 Preparing compilation configs...');
        const compilationConfigs = fileContents.map((file) => ({
          content: file.content,
          fileName: file.filePath,
          listener: new ApexSymbolCollectorListener(),
          options: {
            includeComments: false,
            enableReferenceCorrection: true,
          },
        }));

        // Track file-level metrics
        const fileMetrics: FileCompilationMetrics[] = [];
        const benchmarkResults: Record<string, Benchmark.Target> = {};
        const batchTimings: Record<number, number> = {};

        // Benchmark settings (use longer times in CI/CD, quick mode for validation)
        const isCI = process.env.CI === 'true';
        const isQuick = process.env.QUICK === 'true';
        const benchmarkSettings = isCI
          ? { maxTime: 60, minTime: 10, minSamples: 1, initCount: 1 } // CI settings
          : isQuick
            ? { maxTime: 1, minTime: 0.1, minSamples: 1, initCount: 1 } // Quick validation (1 sample only)
            : { maxTime: 10, minTime: 2, minSamples: 1, initCount: 1 }; // Local settings

        const mode = isCI
          ? 'CI (comprehensive)'
          : isQuick
            ? 'Quick (validation)'
            : 'Local (fast validation)';
        console.log(`Benchmark mode: ${mode}`);
        console.log(
          `Settings: maxTime=${benchmarkSettings.maxTime}s, ` +
            `minTime=${benchmarkSettings.minTime}s, ` +
            `minSamples=${benchmarkSettings.minSamples}`,
        );

        // Use Benchmark.js for accurate timing measurements
        console.log(
          `\n⚙️  Compiling ${apexFiles.length} files in batches of ${config.batchSize}...`,
        );
        const suite = new Benchmark.Suite('EDA Workspace Compilation');

        // Add benchmark for each batch
        for (
          let batchStart = 0;
          batchStart < compilationConfigs.length;
          batchStart += config.batchSize
        ) {
          const batch = compilationConfigs.slice(
            batchStart,
            batchStart + config.batchSize,
          );
          const batchNum = Math.floor(batchStart / config.batchSize) + 1;
          const totalBatches = Math.ceil(
            compilationConfigs.length / config.batchSize,
          );
          const currentBatchStart = batchStart;

          suite.add(
            `Batch ${batchNum}/${totalBatches} (${batch.length} files)`,
            {
              defer: true,
              ...benchmarkSettings,
              fn: async (deferred: { resolve: () => void }) => {
                const results = await Effect.runPromise(
                  compilerService.compileMultipleWithConfigs(batch),
                );

                // Track metrics for each file in batch
                batch.forEach((fileConfig, index) => {
                  const result = (results as Array<unknown>)[index] as
                    | CompilationResult<SymbolTable>
                    | undefined;
                  const fileInfo = fileContents[currentBatchStart + index];

                  if (result) {
                    // Timing will be updated from benchmark stats after suite completes
                    const compileTime = 0;
                    const metrics = trackCompilationMetrics(
                      fileConfig.fileName,
                      compileTime,
                      result,
                      fileInfo.size,
                    );
                    fileMetrics.push(metrics);
                  }
                });

                // Take memory snapshot after batch
                const snapshot = measureMemoryUsage();
                memorySnapshots.push(snapshot);

                deferred.resolve();
              },
            },
          );
        }

        // Run benchmark suite with timeout protection
        const startTime = Date.now();
        let suiteCompleted = false;
        const timeoutMs = isQuick ? 30_000 : 600_000; // 30s for quick, 10min for full
        const timeoutId = setTimeout(() => {
          if (!suiteCompleted) {
            console.warn('\n⚠️  Benchmark suite timeout - aborting...');
            suite.abort();
            suiteCompleted = true;
          }
        }, timeoutMs);

        await new Promise<void>((resolve) => {
          suite
            .on('cycle', function (event: Benchmark.Event) {
              const benchmark = event.target as Benchmark.Target;
              if (benchmark.name && benchmark.stats) {
                benchmarkResults[benchmark.name] = benchmark;
                // Extract batch number and store timing (mean in seconds, convert to ms)
                const match = benchmark.name.match(/Batch (\d+)\//);
                if (match && benchmark.stats) {
                  const batchNum = parseInt(match[1], 10);
                  batchTimings[batchNum] = benchmark.stats.mean * 1000; // Convert to ms
                }
              }
              console.log(String(benchmark));
            })
            .on('complete', function (this: Benchmark.Suite) {
              clearTimeout(timeoutId);
              suiteCompleted = true;
              console.log(
                `\nFastest batch: ${this.filter('fastest').map('name').join(', ')}`,
              );
              // Abort suite to ensure all timers are cleared
              suite.abort();
              resolve();
            })
            .run({ async: true });
        });
        const endTime = Date.now();
        const totalCompileTime = endTime - startTime;

        // Update file metrics with benchmark timings
        let fileIndex = 0;
        for (let i = 0; i < compilationConfigs.length; i += config.batchSize) {
          const batchNum = Math.floor(i / config.batchSize) + 1;
          const batchSize = Math.min(
            config.batchSize,
            compilationConfigs.length - i,
          );
          const batchTime =
            batchTimings[batchNum] ||
            totalCompileTime /
              Math.ceil(compilationConfigs.length / config.batchSize);

          for (
            let j = 0;
            j < batchSize && fileIndex < fileMetrics.length;
            j++
          ) {
            fileMetrics[fileIndex].compileTimeMs = config.perFileTiming
              ? batchTime
              : batchTime / batchSize;
            fileIndex++;
          }
        }

        // Final measurements
        const finalMemory = measureMemoryUsage();
        memorySnapshots.push(finalMemory);
        const peakMemory = findPeakMemory(memorySnapshots);

        // Calculate average time per file from benchmark results
        const totalBenchmarkTime = Object.values(benchmarkResults).reduce(
          (sum, b) => sum + (b.stats?.mean || 0) * 1000, // Convert seconds to ms
          0,
        );
        const averageTimePerFileMs =
          totalBenchmarkTime > 0
            ? totalBenchmarkTime / apexFiles.length
            : totalCompileTime / apexFiles.length;

        // Aggregate metrics
        const totalSymbols = fileMetrics.reduce(
          (sum, m) => sum + m.symbolCount,
          0,
        );
        const totalReferences = fileMetrics.reduce(
          (sum, m) => sum + m.referenceCount,
          0,
        );
        const totalScopes = fileMetrics.reduce(
          (sum, m) => sum + m.scopeCount,
          0,
        );
        const totalErrors = fileMetrics.reduce(
          (sum, m) => sum + m.errorCount,
          0,
        );
        const totalWarnings = fileMetrics.reduce(
          (sum, m) => sum + m.warningCount,
          0,
        );

        const metrics: PerformanceMetrics = {
          startTime,
          endTime,
          totalTimeMs: totalCompileTime,
          initialMemory,
          peakMemory,
          finalMemory,
          fileMetrics,
          totalFiles: apexFiles.length,
          totalSymbols,
          totalReferences,
          totalScopes,
          totalErrors,
          totalWarnings,
          averageTimePerFileMs,
          memoryGrowthMB: calculateMemoryGrowth(initialMemory, finalMemory),
          peakMemoryMB: peakMemory.heapUsedMB,
        };

        // Generate and output report
        const report = generatePerformanceReport(metrics, config.outputJson);
        console.log(report);

        // Assertions
        expect(metrics.totalFiles).toBeGreaterThan(0);
        expect(metrics.totalTimeMs).toBeGreaterThan(0);
        expect(metrics.totalSymbols).toBeGreaterThan(0);
        expect(metrics.peakMemoryMB).toBeGreaterThan(0);
      },
      process.env.QUICK === 'true' ? 60_000 : 900_000,
    ); // 1min for quick, 15min for full
  });

  describe('Batch Compilation Performance', () => {
    const config: TestConfig = { ...DEFAULT_CONFIG, maxFiles: 100 };

    it(
      'should measure performance with different batch sizes',
      async () => {
        if (!checkEDARepositoryExists(EDA_REPO_PATH)) {
          console.log('Skipping test: EDA repository not found');
          return;
        }

        const apexFiles = findApexFiles(EDA_FORCE_APP_PATH, config.maxFiles);
        if (apexFiles.length === 0) {
          return;
        }

        const fileContents = apexFiles
          .slice(0, Math.min(100, apexFiles.length))
          .map((file) => {
            const content = fs.readFileSync(file.filePath, 'utf8');
            return {
              content,
              fileName: file.filePath,
              filePath: file.filePath,
            };
          });

        const batchSizes = [10, 25, 50, 100];
        const suite = new Benchmark.Suite('Batch Size Comparison');
        const results: Record<string, Benchmark.Target> = {};

        // Benchmark settings (use longer times in CI/CD, quick mode for validation)
        const isCI = process.env.CI === 'true';
        const isQuick = process.env.QUICK === 'true';
        const benchmarkSettings = isCI
          ? { maxTime: 60, minTime: 10, minSamples: 1, initCount: 1 } // CI settings
          : isQuick
            ? { maxTime: 1, minTime: 0.1, minSamples: 1, initCount: 1 } // Quick validation (1 sample only)
            : { maxTime: 10, minTime: 2, minSamples: 1, initCount: 1 }; // Local settings

        const mode = isCI
          ? 'CI (comprehensive)'
          : isQuick
            ? 'Quick (validation)'
            : 'Local (fast validation)';
        console.log(`Benchmark mode: ${mode}`);
        console.log(
          `Settings: maxTime=${benchmarkSettings.maxTime}s, ` +
            `minTime=${benchmarkSettings.minTime}s, ` +
            `minSamples=${benchmarkSettings.minSamples}`,
        );

        for (const batchSize of batchSizes) {
          const compilationConfigs = fileContents
            .slice(0, batchSize)
            .map((file) => ({
              content: file.content,
              fileName: file.filePath,
              listener: new ApexSymbolCollectorListener(),
              options: {
                includeComments: false,
                enableReferenceCorrection: true,
              },
            }));

          suite.add(`Batch size ${batchSize}`, {
            defer: true,
            ...benchmarkSettings,
            fn: async (deferred: { resolve: () => void }) => {
              await Effect.runPromise(
                compilerService.compileMultipleWithConfigs(compilationConfigs),
              );
              deferred.resolve();
            },
          });
        }

        let suiteCompleted = false;
        const timeoutMs = isQuick ? 20_000 : 300_000; // 20s for quick, 5min for full
        const timeoutId = setTimeout(() => {
          if (!suiteCompleted) {
            console.warn('\n⚠️  Benchmark suite timeout - aborting...');
            suite.abort();
            suiteCompleted = true;
          }
        }, timeoutMs);

        await new Promise<void>((resolve) => {
          suite
            .on('cycle', function (event: Benchmark.Event) {
              const benchmark = event.target as Benchmark.Target;
              if (benchmark.name) {
                results[benchmark.name] = benchmark;
              }
              console.log(String(benchmark));
            })
            .on('complete', function (this: Benchmark.Suite) {
              clearTimeout(timeoutId);
              suiteCompleted = true;
              console.log(
                `\nFastest batch size: ${this.filter('fastest').map('name').join(', ')}`,
              );
              suite.abort();
              resolve();
            })
            .run({ async: true });
        });

        expect(Object.keys(results).length).toBe(batchSizes.length);
      },
      process.env.QUICK === 'true'
        ? 30_000
        : process.env.CI === 'true'
          ? 600_000
          : 300_000,
    ); // 30s for quick, 10min for CI, 5min for local
  });

  describe('Incremental Load Performance', () => {
    const config: TestConfig = { ...DEFAULT_CONFIG, maxFiles: 50 };

    it(
      'should measure cost of adding files incrementally',
      async () => {
        if (!checkEDARepositoryExists(EDA_REPO_PATH)) {
          console.log('Skipping test: EDA repository not found');
          return;
        }

        const apexFiles = findApexFiles(EDA_FORCE_APP_PATH, config.maxFiles);
        if (apexFiles.length === 0) {
          return;
        }

        const initialMemory = measureMemoryUsage();
        const suite = new Benchmark.Suite('Incremental File Compilation');
        const results: Record<string, Benchmark.Target> = {};

        // Benchmark settings (use longer times in CI/CD)
        const isCI = process.env.CI === 'true';
        const benchmarkSettings = isCI
          ? { maxTime: 30, minTime: 5, minSamples: 1, initCount: 1 } // CI settings
          : { maxTime: 8, minTime: 2, minSamples: 1, initCount: 1 }; // Local settings

        console.log(
          `Benchmark mode: ${isCI ? 'CI (comprehensive)' : 'Local (fast validation)'}`,
        );
        console.log(
          `Settings: maxTime=${benchmarkSettings.maxTime}s, minSamples=${benchmarkSettings.minSamples}`,
        );

        for (let i = 0; i < Math.min(10, apexFiles.length); i++) {
          const file = apexFiles[i];
          const content = fs.readFileSync(file.filePath, 'utf8');
          const fileName = path.basename(file.filePath);

          suite.add(`File ${i + 1}: ${fileName}`, {
            defer: true,
            ...benchmarkSettings,
            fn: async (deferred: { resolve: () => void }) => {
              const listener = new ApexSymbolCollectorListener();
              compilerService.compile(content, file.filePath, listener, {
                includeComments: false,
                enableReferenceCorrection: true,
              });
              deferred.resolve();
            },
          });
        }

        let suiteCompleted = false;
        const isQuick = process.env.QUICK === 'true';
        const timeoutMs = isQuick ? 15_000 : 120_000; // 15s for quick, 2min for full
        const timeoutId = setTimeout(() => {
          if (!suiteCompleted) {
            console.warn('\n⚠️  Benchmark suite timeout - aborting...');
            suite.abort();
            suiteCompleted = true;
          }
        }, timeoutMs);

        await new Promise<void>((resolve) => {
          suite
            .on('cycle', function (event: Benchmark.Event) {
              const benchmark = event.target as Benchmark.Target;
              if (benchmark.name) {
                results[benchmark.name] = benchmark;
              }
              console.log(String(benchmark));
            })
            .on('complete', function (this: Benchmark.Suite) {
              clearTimeout(timeoutId);
              suiteCompleted = true;
              const avgTime =
                Object.values(results).reduce(
                  (sum, b) => sum + (b.stats?.mean || 0),
                  0,
                ) / Object.keys(results).length;
              console.log(
                `\nAverage time per file: ${(avgTime * 1000).toFixed(2)}ms`,
              );
              suite.abort();
              resolve();
            })
            .run({ async: true });
        });

        const finalMemory = measureMemoryUsage();

        console.log('\n=== INCREMENTAL LOAD METRICS ===');
        console.log(
          `Memory growth: ${calculateMemoryGrowth(initialMemory, finalMemory).toFixed(2)}MB`,
        );

        expect(Object.keys(results).length).toBeGreaterThan(0);
      },
      process.env.QUICK === 'true'
        ? 20_000
        : process.env.CI === 'true'
          ? 300_000
          : 120_000,
    ); // 20s for quick, 5min for CI, 2min for local
  });

  describe('Layered Listener Performance Comparison', () => {
    const config: TestConfig = {
      ...DEFAULT_CONFIG,
      maxFiles: process.env.QUICK === 'true' ? 20 : 100,
      batchSize: process.env.QUICK === 'true' ? 10 : DEFAULT_CONFIG.batchSize,
    };

    it(
      'should compare performance of layered vs full listener',
      async () => {
        if (!checkEDARepositoryExists(EDA_REPO_PATH)) {
          console.log('Skipping test: EDA repository not found');
          return;
        }

        const apexFiles = findApexFiles(EDA_FORCE_APP_PATH, config.maxFiles);
        if (apexFiles.length === 0) {
          return;
        }

        console.log(
          `\n📁 Processing ${apexFiles.length} files for layered comparison...`,
        );

        // Read all file contents
        const fileContents = apexFiles.map((file) => {
          const content = fs.readFileSync(file.filePath, 'utf8');
          const stats = fs.statSync(file.filePath);
          return {
            content,
            fileName: file.relativePath,
            filePath: file.filePath,
            size: stats.size,
          };
        });

        // Benchmark settings
        const isCI = process.env.CI === 'true';
        const isQuick = process.env.QUICK === 'true';
        const benchmarkSettings = isCI
          ? { maxTime: 60, minTime: 10, minSamples: 1, initCount: 1 }
          : isQuick
            ? { maxTime: 1, minTime: 0.1, minSamples: 1, initCount: 1 }
            : { maxTime: 10, minTime: 2, minSamples: 1, initCount: 1 };

        const suite = new Benchmark.Suite(
          'Layered vs Full Listener Comparison',
        );
        const results: Record<string, Benchmark.Target> = {};
        const memorySnapshots: Record<string, MemorySnapshot[]> = {};

        // Test configurations
        const testConfigs = [
          {
            name: 'Full Listener (Baseline)',
            createListener: () => new ApexSymbolCollectorListener(),
            layers: ['full'],
          },
          {
            name: 'Layer 1: Public API Only',
            createListener: () => new PublicAPISymbolListener(),
            layers: ['public-api'],
          },
          {
            name: 'Layer 1-2: Public + Protected',
            createListener: () => {
              const table = new SymbolTable();
              return [
                new PublicAPISymbolListener(table),
                new ProtectedSymbolListener(table),
              ];
            },
            layers: ['public-api', 'protected'],
            multiListener: true,
          },
          {
            name: 'Layer 1-3: Public + Protected + Private',
            createListener: () => {
              const table = new SymbolTable();
              return [
                new PublicAPISymbolListener(table),
                new ProtectedSymbolListener(table),
                new PrivateSymbolListener(table),
              ];
            },
            layers: ['public-api', 'protected', 'private'],
            multiListener: true,
          },
        ];

        // Create benchmarks for each configuration
        for (const testConfig of testConfigs) {
          const initialMemory = measureMemoryUsage();
          memorySnapshots[testConfig.name] = [initialMemory];

          suite.add(testConfig.name, {
            defer: true,
            ...benchmarkSettings,
            fn: async (deferred: { resolve: () => void }) => {
              if (testConfig.multiListener) {
                // Multi-layer compilation
                const listeners = testConfig.createListener() as Array<
                  | PublicAPISymbolListener
                  | ProtectedSymbolListener
                  | PrivateSymbolListener
                >;

                // Apply each listener sequentially
                for (const listener of listeners) {
                  for (const file of fileContents) {
                    compilerService.compile(
                      file.content,
                      file.filePath,
                      listener,
                      {
                        includeComments: false,
                        enableReferenceCorrection: true,
                      },
                    );
                  }
                }

                // Take memory snapshot
                const snapshot = measureMemoryUsage();
                memorySnapshots[testConfig.name].push(snapshot);
              } else {
                // Single listener compilation
                const listener = testConfig.createListener() as
                  | ApexSymbolCollectorListener
                  | PublicAPISymbolListener;

                // Compile all files
                const compilationConfigs = fileContents.map((file) => ({
                  content: file.content,
                  fileName: file.filePath,
                  listener: listener.createNewInstance
                    ? listener.createNewInstance()
                    : listener,
                  options: {
                    includeComments: false,
                    enableReferenceCorrection: true,
                  },
                }));

                await Effect.runPromise(
                  compilerService.compileMultipleWithConfigs(
                    compilationConfigs,
                  ),
                );

                // Take memory snapshot
                const snapshot = measureMemoryUsage();
                memorySnapshots[testConfig.name].push(snapshot);
              }

              deferred.resolve();
            },
          });
        }

        let suiteCompleted = false;
        const timeoutMs = isQuick ? 60_000 : 600_000; // 1min for quick, 10min for full
        const timeoutId = setTimeout(() => {
          if (!suiteCompleted) {
            console.warn('\n⚠️  Benchmark suite timeout - aborting...');
            suite.abort();
            suiteCompleted = true;
          }
        }, timeoutMs);

        await new Promise<void>((resolve) => {
          suite
            .on('cycle', function (event: Benchmark.Event) {
              const benchmark = event.target as Benchmark.Target;
              if (benchmark.name) {
                results[benchmark.name] = benchmark;
              }
              console.log(String(benchmark));
            })
            .on('complete', function (this: Benchmark.Suite) {
              clearTimeout(timeoutId);
              suiteCompleted = true;
              console.log(
                `\nFastest approach: ${this.filter('fastest').map('name').join(', ')}`,
              );
              suite.abort();
              resolve();
            })
            .run({ async: true });
        });

        // Generate comprehensive comparison report
        console.log('\n' + '='.repeat(100));
        console.log('LAYERED vs FULL LISTENER PERFORMANCE COMPARISON');
        console.log('='.repeat(100));

        const baseline = results['Full Listener (Baseline)'];
        if (baseline && baseline.stats) {
          const baselineTime = baseline.stats.mean * 1000; // Convert to ms
          const baselineMemory = memorySnapshots['Full Listener (Baseline)'];
          const baselineMemoryGrowth = baselineMemory
            ? calculateMemoryGrowth(
                baselineMemory[0],
                baselineMemory[baselineMemory.length - 1],
              )
            : 0;

          // Collect all metrics for comparison table
          interface ComparisonMetrics {
            name: string;
            timeMs: number;
            speedup: number;
            timeSavingsMs: number;
            timeSavingsPercent: number;
            memoryGrowthMB: number;
            memorySavingsMB: number;
            memorySavingsPercent: number;
          }

          const comparisonMetrics: ComparisonMetrics[] = [];

          // Add baseline first
          comparisonMetrics.push({
            name: 'Full Listener (Baseline)',
            timeMs: baselineTime,
            speedup: 1.0,
            timeSavingsMs: 0,
            timeSavingsPercent: 0,
            memoryGrowthMB: baselineMemoryGrowth,
            memorySavingsMB: 0,
            memorySavingsPercent: 0,
          });

          // Add layered approaches
          for (const [name, result] of Object.entries(results)) {
            if (name === 'Full Listener (Baseline)') {
              continue;
            }

            if (result.stats) {
              const time = result.stats.mean * 1000; // Convert to ms
              const speedup = baselineTime / time;
              const timeSavingsMs = baselineTime - time;
              const timeSavingsPercent = (timeSavingsMs / baselineTime) * 100;
              const memorySnap = memorySnapshots[name];
              const memoryGrowth = memorySnap
                ? calculateMemoryGrowth(
                    memorySnap[0],
                    memorySnap[memorySnap.length - 1],
                  )
                : 0;
              const memorySavingsMB = baselineMemoryGrowth - memoryGrowth;
              const memorySavingsPercent =
                baselineMemoryGrowth > 0
                  ? (memorySavingsMB / baselineMemoryGrowth) * 100
                  : 0;

              comparisonMetrics.push({
                name,
                timeMs: time,
                speedup,
                timeSavingsMs,
                timeSavingsPercent,
                memoryGrowthMB: memoryGrowth,
                memorySavingsMB,
                memorySavingsPercent,
              });
            }
          }

          // Print comparison table
          console.log('\n## Performance Comparison Table');
          console.log('-'.repeat(100));
          console.log(
            'Approach'.padEnd(40) +
              'Time (ms)'.padStart(12) +
              'Speedup'.padStart(10) +
              'Time Saved'.padStart(15) +
              'Memory (MB)'.padStart(15) +
              'Mem Saved'.padStart(15),
          );
          console.log('-'.repeat(100));

          for (const metrics of comparisonMetrics) {
            const timeStr = metrics.timeMs.toFixed(2);
            const speedupStr =
              metrics.speedup === 1.0
                ? '1.00x'
                : `${metrics.speedup.toFixed(2)}x`;
            const timeSavedStr =
              metrics.timeSavingsMs === 0
                ? '-'
                : `${metrics.timeSavingsMs.toFixed(2)}ms (${metrics.timeSavingsPercent.toFixed(1)}%)`;
            const memStr = metrics.memoryGrowthMB.toFixed(2);
            const memSavedStr =
              metrics.memorySavingsMB === 0
                ? '-'
                : `${metrics.memorySavingsMB.toFixed(2)}MB (${metrics.memorySavingsPercent.toFixed(1)}%)`;

            console.log(
              metrics.name.padEnd(40) +
                timeStr.padStart(12) +
                speedupStr.padStart(10) +
                timeSavedStr.padStart(15) +
                memStr.padStart(15) +
                memSavedStr.padStart(15),
            );
          }

          console.log('-'.repeat(100));

          // Detailed breakdown
          console.log('\n## Detailed Breakdown');
          for (const metrics of comparisonMetrics) {
            if (metrics.name === 'Full Listener (Baseline)') {
              console.log(`\n${metrics.name}:`);
              console.log(`  Compilation Time: ${metrics.timeMs.toFixed(2)}ms`);
              console.log(
                `  Memory Growth: ${metrics.memoryGrowthMB.toFixed(2)}MB`,
              );
            } else {
              console.log(`\n${metrics.name}:`);
              console.log(`  Compilation Time: ${metrics.timeMs.toFixed(2)}ms`);
              console.log(
                `  Speedup: ${metrics.speedup.toFixed(2)}x ${metrics.speedup > 1 ? 'faster' : 'slower'}`,
              );
              const timeSavingsMsg =
                `${metrics.timeSavingsMs.toFixed(2)}ms ` +
                `(${metrics.timeSavingsPercent.toFixed(1)}% faster)`;
              console.log(`  Time Savings: ${timeSavingsMsg}`);
              console.log(
                `  Memory Growth: ${metrics.memoryGrowthMB.toFixed(2)}MB`,
              );
              if (metrics.memorySavingsMB > 0) {
                const memSavingsMsg =
                  `${metrics.memorySavingsMB.toFixed(2)}MB ` +
                  `(${metrics.memorySavingsPercent.toFixed(1)}% less)`;
                console.log(`  Memory Savings: ${memSavingsMsg}`);
              } else if (metrics.memorySavingsMB < 0) {
                const memOverheadMsg =
                  `${Math.abs(metrics.memorySavingsMB).toFixed(2)}MB ` +
                  `(${Math.abs(metrics.memorySavingsPercent).toFixed(1)}% more)`;
                console.log(`  Memory Overhead: ${memOverheadMsg}`);
              }
            }
          }

          // Summary insights
          console.log('\n## Key Insights');
          const fastest = comparisonMetrics.reduce((prev, curr) =>
            curr.timeMs < prev.timeMs ? curr : prev,
          );
          const mostMemoryEfficient = comparisonMetrics.reduce((prev, curr) =>
            curr.memoryGrowthMB < prev.memoryGrowthMB ? curr : prev,
          );

          if (fastest.name !== 'Full Listener (Baseline)') {
            const fastestMsg =
              `${fastest.name} ` +
              `(${fastest.speedup.toFixed(2)}x faster than baseline)`;
            console.log(`✓ Fastest approach: ${fastestMsg}`);
          }
          if (mostMemoryEfficient.name !== 'Full Listener (Baseline)') {
            const memMsg =
              `${mostMemoryEfficient.name} ` +
              `(saves ${mostMemoryEfficient.memorySavingsMB.toFixed(2)}MB)`;
            console.log(`✓ Most memory efficient: ${memMsg}`);
          }

          const publicAPIOnly = comparisonMetrics.find(
            (m) => m.name === 'Layer 1: Public API Only',
          );
          if (publicAPIOnly) {
            console.log('\n📊 Public API Only vs Full Listener:');
            const timeMsg = `${publicAPIOnly.timeSavingsPercent.toFixed(1)}% faster compilation`;
            console.log(`  - ${timeMsg}`);
            const memMsg = `${publicAPIOnly.memorySavingsMB.toFixed(2)}MB less memory usage`;
            console.log(`  - ${memMsg}`);
            console.log(
              '  - Ideal for: Fast initial workspace loading, public API discovery',
            );
          }

          const allLayers = comparisonMetrics.find(
            (m) => m.name === 'Layer 1-3: Public + Protected + Private',
          );
          if (allLayers) {
            console.log('\n📊 All Layers vs Full Listener:');
            const timeSign = allLayers.timeSavingsPercent > 0 ? '+' : '';
            const timeDir =
              allLayers.timeSavingsPercent > 0 ? 'faster' : 'slower';
            const timeMsg = `${timeSign}${allLayers.timeSavingsPercent.toFixed(1)}% ${timeDir} compilation`;
            console.log(`  - ${timeMsg}`);

            const memAction = allLayers.memorySavingsMB > 0 ? 'Saves' : 'Uses';
            const memAmount = Math.abs(allLayers.memorySavingsMB).toFixed(2);
            const memDir = allLayers.memorySavingsMB > 0 ? 'less' : 'more';
            const memMsg = `${memAction} ${memAmount}MB ${memDir} memory`;
            console.log(`  - ${memMsg}`);
            console.log(
              '  - Note: Layered approach provides same symbol coverage ' +
                'with progressive enhancement capability',
            );
          }
        }

        // Count symbols for each approach - comprehensive comparison
        console.log('\n' + '='.repeat(100));
        console.log('SYMBOL COUNT COMPARISON');
        console.log('='.repeat(100));

        // Sample a few files to count symbols
        const sampleFiles = fileContents.slice(
          0,
          Math.min(10, fileContents.length),
        );

        interface SymbolCountMetrics {
          name: string;
          totalSymbols: number;
          totalReferences: number;
          avgSymbolsPerFile: number;
          avgReferencesPerFile: number;
          symbolCoveragePercent: number;
        }

        const symbolMetrics: SymbolCountMetrics[] = [];
        let baselineSymbolCount = 0;

        for (const testConfig of testConfigs) {
          let totalSymbols = 0;
          let totalReferences = 0;

          if (testConfig.multiListener) {
            const listeners = testConfig.createListener() as Array<
              | PublicAPISymbolListener
              | ProtectedSymbolListener
              | PrivateSymbolListener
            >;
            const symbolTable = listeners[0].getResult();

            for (const listener of listeners) {
              for (const file of sampleFiles) {
                compilerService.compile(file.content, file.filePath, listener, {
                  includeComments: false,
                  enableReferenceCorrection: true,
                });
              }
            }

            totalSymbols = symbolTable.getAllSymbols().length;
            totalReferences = symbolTable.getAllReferences().length;
          } else {
            const listener = testConfig.createListener() as
              | ApexSymbolCollectorListener
              | PublicAPISymbolListener;

            for (const file of sampleFiles) {
              const result = compilerService.compile(
                file.content,
                file.filePath,
                listener.createNewInstance
                  ? listener.createNewInstance()
                  : listener,
                {
                  includeComments: false,
                  enableReferenceCorrection: true,
                },
              );

              if (result.result) {
                const table = result.result as SymbolTable;
                totalSymbols += table.getAllSymbols().length;
                totalReferences += table.getAllReferences().length;
              }
            }
          }

          if (testConfig.name === 'Full Listener (Baseline)') {
            baselineSymbolCount = totalSymbols;
          }

          const symbolCoveragePercent =
            baselineSymbolCount > 0
              ? (totalSymbols / baselineSymbolCount) * 100
              : 100;

          symbolMetrics.push({
            name: testConfig.name,
            totalSymbols,
            totalReferences,
            avgSymbolsPerFile: Math.round(totalSymbols / sampleFiles.length),
            avgReferencesPerFile: Math.round(
              totalReferences / sampleFiles.length,
            ),
            symbolCoveragePercent,
          });
        }

        // Print symbol count comparison table
        console.log(`\n(Sample: ${sampleFiles.length} files)`);
        console.log('-'.repeat(100));
        console.log(
          'Approach'.padEnd(40) +
            'Symbols'.padStart(12) +
            'References'.padStart(15) +
            'Avg/File'.padStart(12) +
            'Coverage'.padStart(15),
        );
        console.log('-'.repeat(100));

        for (const metrics of symbolMetrics) {
          const coverageStr =
            metrics.name === 'Full Listener (Baseline)'
              ? '100.0% (baseline)'
              : `${metrics.symbolCoveragePercent.toFixed(1)}%`;

          console.log(
            metrics.name.padEnd(40) +
              metrics.totalSymbols.toLocaleString().padStart(12) +
              metrics.totalReferences.toLocaleString().padStart(15) +
              metrics.avgSymbolsPerFile.toString().padStart(12) +
              coverageStr.padStart(15),
          );
        }

        console.log('-'.repeat(100));

        // Detailed symbol breakdown
        console.log('\n## Symbol Coverage Analysis');
        for (const metrics of symbolMetrics) {
          if (metrics.name === 'Full Listener (Baseline)') {
            console.log(`\n${metrics.name}:`);
            console.log(
              `  Total Symbols: ${metrics.totalSymbols.toLocaleString()}`,
            );
            console.log(
              `  Total References: ${metrics.totalReferences.toLocaleString()}`,
            );
            console.log(
              `  Average per File: ${metrics.avgSymbolsPerFile} symbols, ${metrics.avgReferencesPerFile} references`,
            );
          } else {
            const symbolDiff = metrics.totalSymbols - baselineSymbolCount;
            const symbolDiffPercent =
              baselineSymbolCount > 0
                ? ((symbolDiff / baselineSymbolCount) * 100).toFixed(1)
                : '0.0';

            console.log(`\n${metrics.name}:`);
            const symbolDiffSign = symbolDiff >= 0 ? '+' : '';
            const symbolMsg =
              `${metrics.totalSymbols.toLocaleString()} ` +
              `(${symbolDiffSign}${symbolDiff}, ${symbolDiffPercent}%)`;
            console.log(`  Total Symbols: ${symbolMsg}`);
            console.log(
              `  Total References: ${metrics.totalReferences.toLocaleString()}`,
            );
            console.log(
              `  Average per File: ${metrics.avgSymbolsPerFile} symbols, ${metrics.avgReferencesPerFile} references`,
            );
            console.log(
              `  Coverage: ${metrics.symbolCoveragePercent.toFixed(1)}% of baseline`,
            );
          }
        }

        console.log('\n' + '='.repeat(100));

        expect(Object.keys(results).length).toBe(testConfigs.length);
      },
      process.env.QUICK === 'true' ? 90_000 : 900_000,
    ); // 1.5min for quick, 15min for full
  });

  describe('Layered Listener Incremental Performance', () => {
    const config: TestConfig = { ...DEFAULT_CONFIG, maxFiles: 30 };

    it(
      'should measure incremental cost of each layer',
      async () => {
        if (!checkEDARepositoryExists(EDA_REPO_PATH)) {
          console.log('Skipping test: EDA repository not found');
          return;
        }

        const apexFiles = findApexFiles(EDA_FORCE_APP_PATH, config.maxFiles);
        if (apexFiles.length === 0) {
          return;
        }

        console.log(
          `\n📁 Processing ${apexFiles.length} files for incremental layer analysis...`,
        );

        const fileContents = apexFiles.map((file) => {
          const content = fs.readFileSync(file.filePath, 'utf8');
          return {
            content,
            fileName: file.filePath,
            filePath: file.filePath,
          };
        });

        const isCI = process.env.CI === 'true';
        const isQuick = process.env.QUICK === 'true';
        const benchmarkSettings = isCI
          ? { maxTime: 30, minTime: 5, minSamples: 1, initCount: 1 }
          : isQuick
            ? { maxTime: 1, minTime: 0.1, minSamples: 1, initCount: 1 }
            : { maxTime: 8, minTime: 2, minSamples: 1, initCount: 1 };

        const suite = new Benchmark.Suite('Incremental Layer Cost');
        const results: Record<string, Benchmark.Target> = {};

        // Test each layer incrementally
        const layerTests = [
          {
            name: 'Layer 1: Public API',
            compile: (file: (typeof fileContents)[0]) => {
              const listener = new PublicAPISymbolListener();
              return compilerService.compile(
                file.content,
                file.filePath,
                listener,
                {
                  includeComments: false,
                  enableReferenceCorrection: true,
                },
              );
            },
          },
          {
            name: 'Layer 2: + Protected',
            compile: (file: (typeof fileContents)[0]) => {
              const table = new SymbolTable();
              const publicListener = new PublicAPISymbolListener(table);
              const protectedListener = new ProtectedSymbolListener(table);
              compilerService.compile(
                file.content,
                file.filePath,
                publicListener,
                {
                  includeComments: false,
                  enableReferenceCorrection: true,
                },
              );
              return compilerService.compile(
                file.content,
                file.filePath,
                protectedListener,
                {
                  includeComments: false,
                  enableReferenceCorrection: true,
                },
              );
            },
          },
          {
            name: 'Layer 3: + Private',
            compile: (file: (typeof fileContents)[0]) => {
              const table = new SymbolTable();
              const publicListener = new PublicAPISymbolListener(table);
              const protectedListener = new ProtectedSymbolListener(table);
              const privateListener = new PrivateSymbolListener(table);
              compilerService.compile(
                file.content,
                file.filePath,
                publicListener,
                {
                  includeComments: false,
                  enableReferenceCorrection: true,
                },
              );
              compilerService.compile(
                file.content,
                file.filePath,
                protectedListener,
                {
                  includeComments: false,
                  enableReferenceCorrection: true,
                },
              );
              return compilerService.compile(
                file.content,
                file.filePath,
                privateListener,
                {
                  includeComments: false,
                  enableReferenceCorrection: true,
                },
              );
            },
          },
        ];

        // Create benchmark for each layer
        for (const layerTest of layerTests) {
          suite.add(layerTest.name, {
            defer: true,
            ...benchmarkSettings,
            fn: async (deferred: { resolve: () => void }) => {
              // Compile all files with this layer configuration
              for (const file of fileContents) {
                await layerTest.compile(file);
              }
              deferred.resolve();
            },
          });
        }

        let suiteCompleted = false;
        const timeoutMs = isQuick ? 30_000 : 300_000; // 30s for quick, 5min for full
        const timeoutId = setTimeout(() => {
          if (!suiteCompleted) {
            console.warn('\n⚠️  Benchmark suite timeout - aborting...');
            suite.abort();
            suiteCompleted = true;
          }
        }, timeoutMs);

        await new Promise<void>((resolve) => {
          suite
            .on('cycle', function (event: Benchmark.Event) {
              const benchmark = event.target as Benchmark.Target;
              if (benchmark.name) {
                results[benchmark.name] = benchmark;
              }
              console.log(String(benchmark));
            })
            .on('complete', function (this: Benchmark.Suite) {
              clearTimeout(timeoutId);
              suiteCompleted = true;

              // Calculate incremental costs
              console.log('\n' + '='.repeat(80));
              console.log('INCREMENTAL LAYER COST ANALYSIS');
              console.log('='.repeat(80));

              const layer1 = results['Layer 1: Public API'];
              const layer2 = results['Layer 2: + Protected'];
              const layer3 = results['Layer 3: + Private'];

              if (layer1?.stats && layer2?.stats && layer3?.stats) {
                const l1Time = layer1.stats.mean * 1000;
                const l2Time = layer2.stats.mean * 1000;
                const l3Time = layer3.stats.mean * 1000;

                console.log(`\nLayer 1 (Public API): ${l1Time.toFixed(2)}ms`);
                console.log(`Layer 2 (+ Protected): ${l2Time.toFixed(2)}ms`);
                console.log(
                  `  Incremental cost: ${(l2Time - l1Time).toFixed(2)}ms`,
                );
                console.log(`Layer 3 (+ Private): ${l3Time.toFixed(2)}ms`);
                console.log(
                  `  Incremental cost: ${(l3Time - l2Time).toFixed(2)}ms`,
                );

                console.log(
                  `\nLayer 1 percentage: ${((l1Time / l3Time) * 100).toFixed(1)}%`,
                );
                console.log(
                  `Layer 2 percentage: ${(((l2Time - l1Time) / l3Time) * 100).toFixed(1)}%`,
                );
                console.log(
                  `Layer 3 percentage: ${(((l3Time - l2Time) / l3Time) * 100).toFixed(1)}%`,
                );
              }

              suite.abort();
              resolve();
            })
            .run({ async: true });
        });

        expect(Object.keys(results).length).toBe(layerTests.length);
      },
      process.env.QUICK === 'true' ? 40_000 : 300_000,
    ); // 40s for quick, 5min for full
  });

  describe('Symbol Manager/Graph Addition Cost Analysis', () => {
    const config: TestConfig = {
      ...DEFAULT_CONFIG,
      maxFiles: process.env.QUICK === 'true' ? 20 : 100,
      batchSize: process.env.QUICK === 'true' ? 10 : DEFAULT_CONFIG.batchSize,
    };

    it(
      'should measure CPU and memory costs when adding symbols to manager/graph',
      async () => {
        if (!checkEDARepositoryExists(EDA_REPO_PATH)) {
          console.log('Skipping test: EDA repository not found');
          return;
        }

        const apexFiles = findApexFiles(EDA_FORCE_APP_PATH, config.maxFiles);
        if (apexFiles.length === 0) {
          return;
        }

        console.log(
          `\n📁 Processing ${apexFiles.length} files for manager/graph cost analysis...`,
        );

        // Read all file contents
        const fileContents = apexFiles.map((file) => {
          const content = fs.readFileSync(file.filePath, 'utf8');
          const stats = fs.statSync(file.filePath);
          return {
            content,
            fileName: file.relativePath,
            filePath: file.filePath,
            size: stats.size,
          };
        });

        // Phase 1: Note - We'll parse files as part of compilation
        // For accurate measurement, we'll track parse+table creation time separately
        console.log('\n## Phase 1: Preparing files for compilation...');
        const parseTimeMs = 0; // Will be measured as part of compilation

        // Test configurations
        const testConfigs = [
          {
            name: 'Full Listener (Baseline)',
            createListener: () => new ApexSymbolCollectorListener(),
            multiListener: false,
          },
          {
            name: 'Layer 1: Public API Only',
            createListener: () => {
              const table = new SymbolTable();
              return [new PublicAPISymbolListener(table)];
            },
            multiListener: true,
          },
          {
            name: 'Layer 1-2: Public + Protected',
            createListener: () => {
              const table = new SymbolTable();
              return [
                new PublicAPISymbolListener(table),
                new ProtectedSymbolListener(table),
              ];
            },
            multiListener: true,
          },
          {
            name: 'Layer 1-3: Public + Protected + Private',
            createListener: () => {
              const table = new SymbolTable();
              return [
                new PublicAPISymbolListener(table),
                new ProtectedSymbolListener(table),
                new PrivateSymbolListener(table),
              ];
            },
            multiListener: true,
          },
        ];

        interface LayerMetrics {
          name: string;
          parseAndTableTimeMs: number;
          managerAdditionMetrics: ManagerAdditionMetrics;
          totalSymbols: number;
          totalReferences: number;
        }

        const layerMetrics: LayerMetrics[] = [];

        // Phase 2: For each layer configuration, create SymbolTables and measure manager addition cost
        for (const testConfig of testConfigs) {
          console.log(`\n## Processing: ${testConfig.name}`);

          const tableStartTime = Date.now();
          const symbolTables = new Map<string, SymbolTable>();
          const fileUris: string[] = [];

          // Create SymbolTables using listeners
          if (testConfig.multiListener) {
            const listeners = testConfig.createListener() as Array<
              | PublicAPISymbolListener
              | ProtectedSymbolListener
              | PrivateSymbolListener
            >;

            // Apply listeners to each file using CompilerService
            // This will create parse trees internally, but ensures compatibility
            for (const file of fileContents) {
              // Create a fresh symbol table for this file
              const fileTable = new SymbolTable();
              fileTable.setFileUri(file.filePath);

              // Apply each listener sequentially using compile()
              // Each listener will enrich the same symbol table
              for (const listener of listeners) {
                // Create a new listener instance that uses the fileTable
                let listenerToUse:
                  | PublicAPISymbolListener
                  | ProtectedSymbolListener
                  | PrivateSymbolListener;
                if (listener instanceof PublicAPISymbolListener) {
                  listenerToUse = new PublicAPISymbolListener(fileTable);
                } else if (listener instanceof ProtectedSymbolListener) {
                  listenerToUse = new ProtectedSymbolListener(fileTable);
                } else {
                  listenerToUse = new PrivateSymbolListener(fileTable);
                }

                // Compile with this listener (CompilerService handles parse tree walking)
                compilerService.compile(
                  file.content,
                  file.filePath,
                  listenerToUse,
                  {
                    includeComments: false,
                    enableReferenceCorrection: true,
                  },
                );
              }

              symbolTables.set(file.filePath, fileTable);
              fileUris.push(file.filePath);
            }
          } else {
            const listener =
              testConfig.createListener() as ApexSymbolCollectorListener;

            for (const file of fileContents) {
              const result = compilerService.compile(
                file.content,
                file.filePath,
                listener.createNewInstance
                  ? listener.createNewInstance()
                  : listener,
                {
                  includeComments: false,
                  enableReferenceCorrection: true,
                },
              );

              if (result.result) {
                const table = result.result as SymbolTable;
                symbolTables.set(file.filePath, table);
                fileUris.push(file.filePath);
              }
            }
          }

          const tableTimeMs = Date.now() - tableStartTime;
          const parseAndTableTimeMs = parseTimeMs + tableTimeMs;

          // Count symbols and references
          let totalSymbols = 0;
          let totalReferences = 0;
          for (const table of symbolTables.values()) {
            totalSymbols += table.getAllSymbols().length;
            totalReferences += table.getAllReferences().length;
          }

          console.log(
            `✓ Created ${symbolTables.size} SymbolTables ` +
              `(${totalSymbols.toLocaleString()} symbols, ` +
              `${totalReferences.toLocaleString()} references) ` +
              `in ${tableTimeMs.toFixed(2)}ms`,
          );

          // Phase 3: Measure manager addition cost
          console.log('  Measuring manager addition cost...');
          const managerMetrics = await measureManagerAdditionCost(
            symbolTables,
            fileUris,
          );

          layerMetrics.push({
            name: testConfig.name,
            parseAndTableTimeMs,
            managerAdditionMetrics: managerMetrics,
            totalSymbols,
            totalReferences,
          });

          console.log(
            `✓ Manager addition: ${managerMetrics.totalTimeMs.toFixed(2)}ms ` +
              `(${managerMetrics.memoryGrowthMB.toFixed(2)}MB memory growth)`,
          );
        }

        // Phase 4: Generate comprehensive comparison report
        console.log('\n' + '='.repeat(100));
        console.log('SYMBOL MANAGER/GRAPH ADDITION COST ANALYSIS');
        console.log('='.repeat(100));

        // Cost breakdown by layer
        console.log('\n## Cost Breakdown by Layer');
        console.log('-'.repeat(100));
        console.log(
          'Layer'.padEnd(40) +
            'Parse+Table'.padStart(15) +
            'Manager Add'.padStart(15) +
            'Total'.padStart(15) +
            'Memory Growth'.padStart(15),
        );
        console.log('-'.repeat(100));

        for (const metrics of layerMetrics) {
          const totalTime =
            metrics.parseAndTableTimeMs +
            metrics.managerAdditionMetrics.totalTimeMs;
          console.log(
            metrics.name.padEnd(40) +
              `${metrics.parseAndTableTimeMs.toFixed(2)}ms`.padStart(15) +
              `${metrics.managerAdditionMetrics.totalTimeMs.toFixed(2)}ms`.padStart(
                15,
              ) +
              `${totalTime.toFixed(2)}ms`.padStart(15) +
              `${metrics.managerAdditionMetrics.memoryGrowthMB.toFixed(2)}MB`.padStart(
                15,
              ),
          );
        }

        console.log('-'.repeat(100));

        // Per-symbol costs
        console.log('\n## Per-Symbol Costs');
        console.log('-'.repeat(100));
        console.log(
          'Layer'.padEnd(40) +
            'Parse+Table'.padStart(15) +
            'Manager Add'.padStart(15) +
            'Total'.padStart(15) +
            'Memory/Symbol'.padStart(15),
        );
        console.log('-'.repeat(100));

        for (const metrics of layerMetrics) {
          const parsePerSymbol =
            metrics.totalSymbols > 0
              ? metrics.parseAndTableTimeMs / metrics.totalSymbols
              : 0;
          const managerPerSymbol =
            metrics.managerAdditionMetrics.timePerSymbolMs;
          const totalPerSymbol = parsePerSymbol + managerPerSymbol;

          console.log(
            metrics.name.padEnd(40) +
              `${parsePerSymbol.toFixed(4)}ms`.padStart(15) +
              `${managerPerSymbol.toFixed(4)}ms`.padStart(15) +
              `${totalPerSymbol.toFixed(4)}ms`.padStart(15) +
              `${metrics.managerAdditionMetrics.memoryPerSymbolMB.toFixed(6)}MB`.padStart(
                15,
              ),
          );
        }

        console.log('-'.repeat(100));

        // Per-file costs
        console.log('\n## Per-File Costs');
        console.log('-'.repeat(100));
        console.log(
          'Layer'.padEnd(40) +
            'Parse+Table'.padStart(15) +
            'Manager Add'.padStart(15) +
            'Total'.padStart(15) +
            'Memory/File'.padStart(15),
        );
        console.log('-'.repeat(100));

        for (const metrics of layerMetrics) {
          const parsePerFile =
            metrics.managerAdditionMetrics.filesProcessed > 0
              ? metrics.parseAndTableTimeMs /
                metrics.managerAdditionMetrics.filesProcessed
              : 0;
          const managerPerFile = metrics.managerAdditionMetrics.timePerFileMs;
          const totalPerFile = parsePerFile + managerPerFile;

          console.log(
            metrics.name.padEnd(40) +
              `${parsePerFile.toFixed(2)}ms`.padStart(15) +
              `${managerPerFile.toFixed(2)}ms`.padStart(15) +
              `${totalPerFile.toFixed(2)}ms`.padStart(15) +
              `${metrics.managerAdditionMetrics.memoryPerFileMB.toFixed(4)}MB`.padStart(
                15,
              ),
          );
        }

        console.log('-'.repeat(100));

        // Detailed breakdown
        console.log('\n## Detailed Breakdown');
        for (const metrics of layerMetrics) {
          const managerAdd = metrics.managerAdditionMetrics;
          const totalTime =
            metrics.parseAndTableTimeMs + managerAdd.totalTimeMs;
          const managerPercent =
            totalTime > 0
              ? ((managerAdd.totalTimeMs / totalTime) * 100).toFixed(1)
              : '0.0';

          console.log(`\n${metrics.name}:`);
          console.log(
            `  Parse + SymbolTable Creation: ${metrics.parseAndTableTimeMs.toFixed(2)}ms`,
          );
          console.log(
            `  Manager Addition: ${managerAdd.totalTimeMs.toFixed(2)}ms (${managerPercent}% of total)`,
          );
          console.log(`  Total Time: ${totalTime.toFixed(2)}ms`);
          console.log(`  Symbols: ${metrics.totalSymbols.toLocaleString()}`);
          console.log(
            `  References: ${metrics.totalReferences.toLocaleString()}`,
          );
          console.log(
            `  Memory Growth: ${managerAdd.memoryGrowthMB.toFixed(2)}MB`,
          );
          console.log(`  Peak Memory: ${managerAdd.peakMemoryMB.toFixed(2)}MB`);
          console.log(
            `  Time per Symbol: ${managerAdd.timePerSymbolMs.toFixed(4)}ms`,
          );
          console.log(
            `  Time per File: ${managerAdd.timePerFileMs.toFixed(2)}ms`,
          );
          console.log(
            `  Memory per Symbol: ${managerAdd.memoryPerSymbolMB.toFixed(6)}MB`,
          );
          console.log(
            `  Memory per File: ${managerAdd.memoryPerFileMB.toFixed(4)}MB`,
          );
        }

        // Key insights
        console.log('\n## Key Insights');
        const baseline = layerMetrics.find(
          (m) => m.name === 'Full Listener (Baseline)',
        );
        if (baseline) {
          const baselineTotalTime =
            baseline.parseAndTableTimeMs +
            baseline.managerAdditionMetrics.totalTimeMs;
          const baselineManagerPercent =
            baselineTotalTime > 0
              ? (
                  (baseline.managerAdditionMetrics.totalTimeMs /
                    baselineTotalTime) *
                  100
                ).toFixed(1)
              : '0.0';

          console.log('\nBaseline (Full Listener):');
          console.log(
            `  Manager addition represents ${baselineManagerPercent}% of total time`,
          );
          console.log(
            `  Manager addition cost: ${baseline.managerAdditionMetrics.totalTimeMs.toFixed(2)}ms`,
          );
          console.log(
            `  Manager addition memory: ${baseline.managerAdditionMetrics.memoryGrowthMB.toFixed(2)}MB`,
          );

          for (const metrics of layerMetrics) {
            if (metrics.name === 'Full Listener (Baseline)') {
              continue;
            }

            const timeSavings =
              baseline.managerAdditionMetrics.totalTimeMs -
              metrics.managerAdditionMetrics.totalTimeMs;
            const baselineManagerTime =
              baseline.managerAdditionMetrics.totalTimeMs;
            const timeSavingsPercent =
              baselineManagerTime > 0
                ? ((timeSavings / baselineManagerTime) * 100).toFixed(1)
                : '0.0';

            const memorySavings =
              baseline.managerAdditionMetrics.memoryGrowthMB -
              metrics.managerAdditionMetrics.memoryGrowthMB;
            const baselineManagerMemory =
              baseline.managerAdditionMetrics.memoryGrowthMB;
            const memorySavingsPercent =
              baselineManagerMemory > 0
                ? ((memorySavings / baselineManagerMemory) * 100).toFixed(1)
                : '0.0';

            console.log(`\n${metrics.name} vs Baseline:`);
            const timeAction = timeSavings >= 0 ? 'saves' : 'uses';
            const timeMsg =
              `  Manager addition time: ${timeAction} ` +
              `${Math.abs(timeSavings).toFixed(2)}ms (${timeSavingsPercent}%)`;
            console.log(timeMsg);

            const memAction = memorySavings >= 0 ? 'saves' : 'uses';
            const memMsg =
              `  Manager addition memory: ${memAction} ` +
              `${Math.abs(memorySavings).toFixed(2)}MB (${memorySavingsPercent}%)`;
            console.log(memMsg);
          }
        }

        console.log('\n' + '='.repeat(100));

        expect(layerMetrics.length).toBe(testConfigs.length);
      },
      process.env.QUICK === 'true' ? 120_000 : 900_000,
    ); // 2min for quick, 15min for full
  });
});
