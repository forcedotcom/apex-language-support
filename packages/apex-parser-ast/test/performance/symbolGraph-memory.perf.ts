/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * ApexSymbolGraph Memory and Performance Benchmarks
 *
 * These benchmarks measure graph operations and memory usage:
 * 1. Symbol addition performance
 * 2. Reference addition performance
 * 3. Symbol lookup performance
 * 4. Reference lookup performance
 * 5. Circular dependency detection
 * 6. Memory usage at different scales
 *
 * Purpose: Track graph performance and memory efficiency over time
 *
 * Moved from: test/references/ApexSymbolGraph.performance.test.ts
 */

import Benchmark from 'benchmark';
import {
  ApexSymbolGraph,
  ReferenceType,
} from '../../src/symbols/ApexSymbolGraph';
import { generateSymbolId } from '../../src/types/UriBasedIdGenerator';
import {
  ApexSymbol,
  SymbolKind,
  SymbolVisibility,
} from '../../src/types/symbol';
import {
  initialize as schedulerInitialize,
  shutdown as schedulerShutdown,
  reset as schedulerReset,
} from '../../src/queue/priority-scheduler-utils';
import { Effect } from 'effect';

describe('ApexSymbolGraph Performance Benchmarks', () => {
  let graph: ApexSymbolGraph;

  const isCI = process.env.CI === 'true';
  const isQuick = process.env.QUICK === 'true';
  const benchmarkSettings = isCI
    ? { maxTime: 30, minTime: 10, minSamples: 5, initCount: 1 }
    : isQuick
      ? { maxTime: 1, minTime: 0.1, minSamples: 1, initCount: 1 }
      : { maxTime: 6, minTime: 2, minSamples: 2, initCount: 1 };

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
      // Ignore
    }
    try {
      await Effect.runPromise(schedulerReset());
    } catch (_error) {
      // Ignore
    }
  });

  beforeEach(() => {
    graph = new ApexSymbolGraph();
  });

  afterEach(() => {
    graph.clear();
  });

  jest.setTimeout(1000 * 60 * 10);

  const createTestSymbol = (
    name: string,
    kind: SymbolKind,
    fqn?: string,
    fileUri: string = 'file:///test/TestFile.cls',
  ): ApexSymbol => {
    const id = generateSymbolId(name, fileUri);
    return {
      id,
      name,
      kind,
      fileUri,
      parentId: null,
      key: {
        prefix: 'symbol',
        name,
        path: [fileUri],
        unifiedId: id,
        fileUri,
        fqn: fqn || name,
        kind,
      },
      fqn: fqn || name,
      _isLoaded: true,
      modifiers: {
        visibility: SymbolVisibility.Public,
        isStatic: false,
        isFinal: false,
        isAbstract: false,
        isVirtual: false,
        isOverride: false,
        isTransient: false,
        isTestMethod: false,
        isWebService: false,
        isBuiltIn: false,
      },
      annotations: [],
      location: {
        symbolRange: {
          startLine: 1,
          startColumn: 1,
          endLine: 1,
          endColumn: name.length + 1,
        },
        identifierRange: {
          startLine: 1,
          startColumn: 1,
          endLine: 1,
          endColumn: name.length + 1,
        },
      },
    };
  };

  it('benchmarks symbol addition (1000 symbols)', (done) => {
    const suite = new Benchmark.Suite();
    const results: Record<string, Benchmark.Target> = {};

    let counter = 0;

    suite
      .add('ApexSymbolGraph.addSymbol (1000 symbols)', {
        defer: true,
        ...benchmarkSettings,
        fn: (deferred: any) => {
          // Add 1000 symbols in this iteration
          for (let i = 0; i < 1000; i++) {
            const symbol = createTestSymbol(
              `Class${counter++}`,
              SymbolKind.Class,
              `Class${counter}`,
              `file:///test/File${counter}.cls`,
            );
            graph.addSymbol(symbol, `File${counter}.cls`);
          }
          deferred.resolve();
        },
      })
      .on('cycle', (event: any) => {
        results[event.target.name] = event.target;
        console.log(String(event.target));
      })
      .on('complete', function (this: any) {
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
          console.warn('Could not read existing results:', error);
        }

        fs.writeFileSync(outputPath, JSON.stringify(allResults, null, 2));
        done();
      })
      .run({ async: true });
  });

  it('benchmarks symbol lookup by name', (done) => {
    // Pre-populate graph with 10,000 symbols
    for (let i = 0; i < 10000; i++) {
      const symbol = createTestSymbol(
        `Class${i}`,
        SymbolKind.Class,
        `Class${i}`,
        `file:///test/File${i}.cls`,
      );
      graph.addSymbol(symbol, `File${i}.cls`);
    }

    const suite = new Benchmark.Suite();
    const results: Record<string, Benchmark.Target> = {};

    suite
      .add('ApexSymbolGraph.lookupSymbolByName (10K symbols)', {
        defer: true,
        ...benchmarkSettings,
        fn: (deferred: any) => {
          const symbolName = `Class${Math.floor(Math.random() * 10000)}`;
          graph.lookupSymbolByName(symbolName);
          deferred.resolve();
        },
      })
      .on('cycle', (event: any) => {
        results[event.target.name] = event.target;
        console.log(String(event.target));
      })
      .on('complete', function (this: any) {
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
          console.warn('Could not read existing results:', error);
        }

        fs.writeFileSync(outputPath, JSON.stringify(allResults, null, 2));
        done();
      })
      .run({ async: true });
  });

  it('benchmarks reference lookup', (done) => {
    // Pre-populate graph
    const symbols: ApexSymbol[] = [];
    for (let i = 0; i < 1000; i++) {
      const symbol = createTestSymbol(
        `Class${i}`,
        SymbolKind.Class,
        `Class${i}`,
        `file:///test/File${i}.cls`,
      );
      symbols.push(symbol);
      graph.addSymbol(symbol, `File${i}.cls`);
    }

    // Add 5,000 references
    for (let i = 0; i < 5000; i++) {
      const sourceIndex = i % 1000;
      const targetIndex = (i + 1) % 1000;

      graph.addReference(
        symbols[sourceIndex],
        symbols[targetIndex],
        ReferenceType.METHOD_CALL,
        {
          symbolRange: {
            startLine: 1,
            startColumn: 1,
            endLine: 1,
            endColumn: 10,
          },
          identifierRange: {
            startLine: 1,
            startColumn: 1,
            endLine: 1,
            endColumn: 10,
          },
        },
      );
    }

    const suite = new Benchmark.Suite();
    const results: Record<string, Benchmark.Target> = {};

    suite
      .add('ApexSymbolGraph.findReferences (1K symbols, 5K refs)', {
        defer: true,
        ...benchmarkSettings,
        fn: (deferred: any) => {
          const randomSymbol = symbols[Math.floor(Math.random() * 1000)];
          graph.findReferencesTo(randomSymbol);
          graph.findReferencesFrom(randomSymbol);
          deferred.resolve();
        },
      })
      .on('cycle', (event: any) => {
        results[event.target.name] = event.target;
        console.log(String(event.target));
      })
      .on('complete', function (this: any) {
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
          console.warn('Could not read existing results:', error);
        }

        fs.writeFileSync(outputPath, JSON.stringify(allResults, null, 2));
        done();
      })
      .run({ async: true });
  });

  it('benchmarks circular dependency detection', (done) => {
    // Pre-populate with circular references
    for (let i = 0; i < 1000; i++) {
      const symbol = createTestSymbol(
        `Class${i}`,
        SymbolKind.Class,
        `Class${i}`,
        `file:///test/File${i}.cls`,
      );
      graph.addSymbol(symbol, `File${i}.cls`);
    }

    // Add circular references (100 cycles)
    for (let i = 0; i < 100; i++) {
      const sourceSymbol = createTestSymbol(
        `Class${i}`,
        SymbolKind.Class,
        `Class${i}`,
        `file:///test/File${i}.cls`,
      );
      const targetSymbol = createTestSymbol(
        `Class${(i + 1) % 100}`,
        SymbolKind.Class,
        `Class${(i + 1) % 100}`,
        `file:///test/File${(i + 1) % 100}.cls`,
      );

      graph.addReference(
        sourceSymbol,
        targetSymbol,
        ReferenceType.METHOD_CALL,
        {
          symbolRange: {
            startLine: 1,
            startColumn: 1,
            endLine: 1,
            endColumn: 10,
          },
          identifierRange: {
            startLine: 1,
            startColumn: 1,
            endLine: 1,
            endColumn: 10,
          },
        },
      );
    }

    const suite = new Benchmark.Suite();
    const results: Record<string, Benchmark.Target> = {};

    suite
      .add('ApexSymbolGraph.detectCircularDependencies (1K symbols)', {
        defer: true,
        ...benchmarkSettings,
        fn: (deferred: any) => {
          graph.detectCircularDependencies();
          deferred.resolve();
        },
      })
      .on('cycle', (event: any) => {
        results[event.target.name] = event.target;
        console.log(String(event.target));
      })
      .on('complete', function (this: any) {
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
          console.warn('Could not read existing results:', error);
        }

        fs.writeFileSync(outputPath, JSON.stringify(allResults, null, 2));
        done();
      })
      .run({ async: true });
  });

  // Informational tests - measure memory usage
  it('measures baseline memory consumption', () => {
    const getMemoryUsage = () => {
      const memUsage = process.memoryUsage();
      return {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external,
        rss: memUsage.rss,
      };
    };

    const mem = getMemoryUsage();
    const stats = graph.getStats();

    console.log('\n=== Baseline (Empty Graph) ===');
    console.log(`Heap Used: ${(mem.heapUsed / 1024 / 1024).toFixed(2)}MB`);
    console.log(`Total Symbols: ${stats.totalSymbols}`);

    expect(stats.totalSymbols).toBe(0);
  });

  it('measures memory with 1,000 symbols', () => {
    const getMemoryUsage = () => process.memoryUsage().heapUsed;

    const before = getMemoryUsage();

    const startTime = performance.now();
    for (let i = 0; i < 1000; i++) {
      const symbol = createTestSymbol(
        `Class${i}`,
        SymbolKind.Class,
        `Class${i}`,
        `file:///test/File${i}.cls`,
      );
      graph.addSymbol(symbol, `File${i}.cls`);
    }
    const addTime = performance.now() - startTime;

    const after = getMemoryUsage();
    const memoryDelta = after - before;
    const stats = graph.getStats();

    console.log('\n=== 1,000 Symbols ===');
    console.log(`Add time: ${addTime.toFixed(2)}ms`);
    console.log(`Memory delta: ${(memoryDelta / 1024 / 1024).toFixed(2)}MB`);
    console.log(`Per symbol: ${(memoryDelta / 1000 / 1024).toFixed(2)}KB`);
    console.log(`Total symbols: ${stats.totalSymbols}`);

    expect(stats.totalSymbols).toBe(1000);
  });

  it('measures memory with 10,000 symbols', () => {
    const getMemoryUsage = () => process.memoryUsage().heapUsed;

    const before = getMemoryUsage();

    const startTime = performance.now();
    for (let i = 0; i < 10000; i++) {
      const symbol = createTestSymbol(
        `Class${i}`,
        SymbolKind.Class,
        `Class${i}`,
        `file:///test/File${i}.cls`,
      );
      graph.addSymbol(symbol, `File${i}.cls`);
    }
    const addTime = performance.now() - startTime;

    const after = getMemoryUsage();
    const memoryDelta = after - before;
    const stats = graph.getStats();

    console.log('\n=== 10,000 Symbols ===');
    console.log(`Add time: ${addTime.toFixed(2)}ms`);
    console.log(`Memory delta: ${(memoryDelta / 1024 / 1024).toFixed(2)}MB`);
    console.log(`Per symbol: ${(memoryDelta / 10000 / 1024).toFixed(2)}KB`);
    console.log(`Total symbols: ${stats.totalSymbols}`);

    expect(stats.totalSymbols).toBe(10000);
  });

  it('measures memory with references', () => {
    const getMemoryUsage = () => process.memoryUsage().heapUsed;

    // Add 1,000 symbols first
    const symbols: ApexSymbol[] = [];
    for (let i = 0; i < 1000; i++) {
      const symbol = createTestSymbol(
        `Class${i}`,
        SymbolKind.Class,
        `Class${i}`,
        `file:///test/File${i}.cls`,
      );
      symbols.push(symbol);
      graph.addSymbol(symbol, `file:///test/File${i}.cls`);
    }

    const beforeRefs = getMemoryUsage();

    const startTime = performance.now();
    // Add 5,000 references
    for (let i = 0; i < 5000; i++) {
      const sourceIndex = i % 1000;
      const targetIndex = (i + 1) % 1000;

      graph.addReference(
        symbols[sourceIndex],
        symbols[targetIndex],
        ReferenceType.METHOD_CALL,
        {
          symbolRange: {
            startLine: 1,
            startColumn: 1,
            endLine: 1,
            endColumn: 10,
          },
          identifierRange: {
            startLine: 1,
            startColumn: 1,
            endLine: 1,
            endColumn: 10,
          },
        },
      );
    }
    const refTime = performance.now() - startTime;

    const afterRefs = getMemoryUsage();
    const refMemoryDelta = afterRefs - beforeRefs;
    const stats = graph.getStats();

    console.log('\n=== 1,000 Symbols + 5,000 References ===');
    console.log(`Reference add time: ${refTime.toFixed(2)}ms`);
    console.log(
      `Memory for refs: ${(refMemoryDelta / 1024 / 1024).toFixed(2)}MB`,
    );
    console.log(
      `Per reference: ${(refMemoryDelta / 5000 / 1024).toFixed(2)}KB`,
    );
    console.log(`Total edges: ${stats.totalEdges}`);

    expect(stats.totalSymbols).toBe(1000);
  });
});
