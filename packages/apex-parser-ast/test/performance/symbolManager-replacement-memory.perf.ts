/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import Benchmark from 'benchmark';
import { Effect } from 'effect';
import {
  initialize as schedulerInitialize,
  reset as schedulerReset,
  shutdown as schedulerShutdown,
} from '../../src/queue/priority-scheduler-utils';
import { CompilerService } from '../../src/parser/compilerService';
import { ApexSymbolCollectorListener } from '../../src/parser/listeners/ApexSymbolCollectorListener';
import { ApexSymbolManager } from '../../src/symbols/ApexSymbolManager';
import { SymbolTable } from '../../src/types/symbol';

describe('ApexSymbolManager replacement memory pressure benchmarks', () => {
  const isCI = process.env.CI === 'true';
  const isQuick = process.env.QUICK === 'true';
  const benchmarkSettings = isCI
    ? { maxTime: 30, minTime: 10, minSamples: 5, initCount: 1 }
    : isQuick
      ? { maxTime: 1, minTime: 0.1, minSamples: 1, initCount: 1 }
      : { maxTime: 6, minTime: 2, minSamples: 2, initCount: 1 };

  const providerFile = 'file:///test/PerfProvider.cls';
  const consumerFile = 'file:///test/PerfConsumer.cls';

  const providerCompact = `
    public class PerfProvider {
      public Integer ping() {
        return 1;
      }
    }
  `;
  const providerVariant = `
    public class PerfProvider
    {
      public Integer ping()
      {
        return 1;
      }
    }
  `;
  const consumerCompact = `
    public class PerfConsumer {
      public Integer run() {
        PerfProvider p = new PerfProvider();
        return p.ping();
      }
    }
  `;
  const consumerVariant = `
    public class PerfConsumer
    {
      public Integer run()
      {
        PerfProvider p =
          new PerfProvider();
        return p.ping();
      }
    }
  `;

  let compilerService: CompilerService;

  const compile = (code: string, fileUri: string): SymbolTable => {
    const listener = new ApexSymbolCollectorListener(undefined, 'full');
    const result = compilerService.compile(code, fileUri, listener, {
      collectReferences: true,
      resolveReferences: true,
    });
    if (!result.result) {
      throw new Error(`Failed to compile ${fileUri}`);
    }
    return result.result;
  };

  const appendBenchmarkResults = (
    results: Record<string, Benchmark.Target>,
  ) => {
    const fs = require('fs');
    const path = require('path');
    const outputPath = path.join(
      __dirname,
      '../apex-parser-ast-benchmark-results.json',
    );

    let allResults = results;
    try {
      if (fs.existsSync(outputPath)) {
        const existing = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
        allResults = { ...existing, ...results };
      }
    } catch (error) {
      console.warn('Could not read existing benchmark results:', error);
    }

    fs.writeFileSync(outputPath, JSON.stringify(allResults, null, 2));
  };

  beforeAll(async () => {
    await Effect.runPromise(
      schedulerInitialize({
        queueCapacity: 100,
        maxHighPriorityStreak: 50,
        idleSleepMs: 1,
      }),
    );
  });

  afterAll(async () => {
    try {
      await Effect.runPromise(schedulerShutdown());
    } catch (_error) {
      // Ignore.
    }
    try {
      await Effect.runPromise(schedulerReset());
    } catch (_error) {
      // Ignore.
    }
  });

  beforeEach(() => {
    compilerService = new CompilerService();
  });

  jest.setTimeout(1000 * 60 * 10);

  it('benchmarks repeated cross-file semantic-equivalent replacement cycles', (done) => {
    const providerCompactTable = compile(providerCompact, providerFile);
    const providerVariantTable = compile(providerVariant, providerFile);
    const consumerCompactTable = compile(consumerCompact, consumerFile);
    const consumerVariantTable = compile(consumerVariant, consumerFile);

    const suite = new Benchmark.Suite();
    const results: Record<string, Benchmark.Target> = {};

    suite
      .add('ApexSymbolManager cross-file replacement cycle (100 cycles)', {
        defer: true,
        ...benchmarkSettings,
        fn: (deferred: any) => {
          const manager = new ApexSymbolManager();
          const cycleCount = 100;
          const run = async () => {
            try {
              await Effect.runPromise(
                manager.addSymbolTable(providerCompactTable, providerFile),
              );
              await Effect.runPromise(
                manager.addSymbolTable(consumerCompactTable, consumerFile),
              );
              for (let i = 0; i < cycleCount; i++) {
                await Effect.runPromise(
                  manager.addSymbolTable(providerVariantTable, providerFile),
                );
                await Effect.runPromise(
                  manager.addSymbolTable(consumerVariantTable, consumerFile),
                );
                await Effect.runPromise(
                  manager.addSymbolTable(providerCompactTable, providerFile),
                );
                await Effect.runPromise(
                  manager.addSymbolTable(consumerCompactTable, consumerFile),
                );
              }
            } finally {
              manager.clear();
              deferred.resolve();
            }
          };
          void run();
        },
      })
      .on('cycle', (event: any) => {
        results[event.target.name] = event.target;
        console.log(String(event.target));
      })
      .on('complete', () => {
        appendBenchmarkResults(results);
        done();
      })
      .run({ async: true });
  });

  it('measures memory and object-count stability under repeated replacements', async () => {
    const providerCompactTable = compile(providerCompact, providerFile);
    const providerVariantTable = compile(providerVariant, providerFile);
    const consumerCompactTable = compile(consumerCompact, consumerFile);
    const consumerVariantTable = compile(consumerVariant, consumerFile);
    const manager = new ApexSymbolManager();
    const cycleCount = isCI ? 400 : isQuick ? 60 : 200;

    try {
      const heapBefore = process.memoryUsage().heapUsed;

      await Effect.runPromise(
        manager.addSymbolTable(providerCompactTable, providerFile),
      );
      await Effect.runPromise(
        manager.addSymbolTable(consumerCompactTable, consumerFile),
      );
      const baselineStats = manager.getStats();

      for (let i = 0; i < cycleCount; i++) {
        await Effect.runPromise(
          manager.addSymbolTable(providerVariantTable, providerFile),
        );
        await Effect.runPromise(
          manager.addSymbolTable(consumerVariantTable, consumerFile),
        );
        await Effect.runPromise(
          manager.addSymbolTable(providerCompactTable, providerFile),
        );
        await Effect.runPromise(
          manager.addSymbolTable(consumerCompactTable, consumerFile),
        );
      }

      if (global.gc) {
        global.gc();
      }

      const heapAfter = process.memoryUsage().heapUsed;
      const heapDeltaMb = (heapAfter - heapBefore) / (1024 * 1024);
      const finalStats = manager.getStats();

      console.log('\n=== Replacement memory pressure ===');
      console.log(`Cycles: ${cycleCount}`);
      console.log(`Heap delta: ${heapDeltaMb.toFixed(2)} MB`);
      console.log(`Baseline refs: ${baselineStats.totalReferences}`);
      console.log(`Final refs: ${finalStats.totalReferences}`);
      console.log(`Baseline symbols: ${baselineStats.totalSymbols}`);
      console.log(`Final symbols: ${finalStats.totalSymbols}`);

      // Keep assertions tolerant while still catching unbounded growth regressions.
      expect(finalStats.totalReferences).toBe(baselineStats.totalReferences);
      expect(finalStats.totalSymbols).toBeLessThanOrEqual(
        baselineStats.totalSymbols + 4,
      );
      expect(heapDeltaMb).toBeLessThan(200);
    } finally {
      manager.clear();
    }
  });
});
