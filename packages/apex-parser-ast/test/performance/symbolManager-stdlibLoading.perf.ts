/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * ApexSymbolManager Standard Library Loading Benchmarks
 *
 * These benchmarks measure standard library loading performance identified
 * as the primary blocker in didOpen (198ms).
 *
 * Key areas measured:
 * 1. Cold start compilation (triggers standard library loading)
 * 2. Warm compilation (cached standard library)
 * 3. Generic type resolution (List<T>, Map<K,V>)
 * 4. Cross-file reference resolution
 *
 * Purpose: Track stdlib loading overhead and identify regressions
 *
 * Renamed from: ApexSymbolManager.memberResolution.performance.test.ts
 * (clarifies focus on stdlib loading vs member resolution)
 */

import Benchmark from 'benchmark';
import { CompilerService } from '../../src/parser/compilerService';
import { ApexSymbolCollectorListener } from '../../src/parser/listeners/ApexSymbolCollectorListener';
import { enableConsoleLogging, setLogLevel } from '@salesforce/apex-lsp-shared';

describe('ApexSymbolManager - Standard Library Loading Benchmarks', () => {
  let compilerService: CompilerService;

  const isCI = process.env.CI === 'true';
  const isQuick = process.env.QUICK === 'true';
  const benchmarkSettings = isCI
    ? { maxTime: 30, minTime: 10, minSamples: 5, initCount: 1 }
    : isQuick
      ? { maxTime: 1, minTime: 0.1, minSamples: 1, initCount: 1 }
      : { maxTime: 6, minTime: 2, minSamples: 2, initCount: 1 };

  // Test code that uses standard library types
  const codeWithStdLibUsage = `
public class TestClass {
    public void testStringMethods() {
        String str = 'Hello';
        Boolean blank = String.isBlank(str);
        String upper = str.toUpperCase();
        Integer len = str.length();
    }
    
    public void testListMethods() {
        List<String> items = new List<String>();
        items.add('First');
        items.add('Second');
        Integer size = items.size();
        String firstItem = items.get(0);
    }
    
    public void testMapMethods() {
        Map<String, Integer> counts = new Map<String, Integer>();
        counts.put('one', 1);
        counts.put('two', 2);
        Integer value = counts.get('one');
        Boolean hasKey = counts.containsKey('one');
    }
}
  `.trim();

  beforeAll(() => {
    enableConsoleLogging();
    setLogLevel('error');
  });

  beforeEach(() => {
    compilerService = new CompilerService();
  });

  jest.setTimeout(1000 * 60 * 10);

  it('benchmarks compilation with standard library cold start', (done) => {
    const suite = new Benchmark.Suite();
    const results: Record<string, Benchmark.Target> = {};

    suite
      .add('Compilation with stdlib cold start', {
        defer: true,
        ...benchmarkSettings,
        fn: (deferred: any) => {
          // Create fresh compiler for each iteration to measure cold start
          const freshCompiler = new CompilerService();
          const listener = new ApexSymbolCollectorListener(undefined, 'full');
          freshCompiler.compile(
            codeWithStdLibUsage,
            'TestClass.cls',
            listener,
            {
              collectReferences: true,
              resolveReferences: true,
            },
          );
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

  it('benchmarks compilation with cached standard library', (done) => {
    const suite = new Benchmark.Suite();
    const results: Record<string, Benchmark.Target> = {};

    // Warm up once before benchmarking
    const warmupListener = new ApexSymbolCollectorListener(undefined, 'full');
    compilerService.compile(codeWithStdLibUsage, 'Warmup.cls', warmupListener, {
      collectReferences: true,
      resolveReferences: true,
    });

    suite
      .add('Compilation with stdlib cached', {
        defer: true,
        ...benchmarkSettings,
        fn: (deferred: any) => {
          const listener = new ApexSymbolCollectorListener(undefined, 'full');
          compilerService.compile(
            codeWithStdLibUsage,
            'TestClass.cls',
            listener,
            {
              collectReferences: true,
              resolveReferences: true,
            },
          );
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

  it('benchmarks generic type resolution (List<T>)', (done) => {
    const suite = new Benchmark.Suite();
    const results: Record<string, Benchmark.Target> = {};

    const listCode = `
public class ListTest {
    public void testGenericList() {
        List<String> strings = new List<String>();
        List<Integer> numbers = new List<Integer>();
        List<Account> accounts = new List<Account>();
    }
}
    `.trim();

    suite
      .add('Generic List<T> resolution', {
        defer: true,
        ...benchmarkSettings,
        fn: (deferred: any) => {
          const listener = new ApexSymbolCollectorListener(undefined, 'full');
          compilerService.compile(listCode, 'ListTest.cls', listener, {
            collectReferences: true,
            resolveReferences: true,
          });
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

  it('benchmarks generic type resolution (Map<K,V>)', (done) => {
    const suite = new Benchmark.Suite();
    const results: Record<string, Benchmark.Target> = {};

    const mapCode = `
public class MapTest {
    public void testGenericMap() {
        Map<String, Integer> counts = new Map<String, Integer>();
        Map<Id, Account> accountMap = new Map<Id, Account>();
    }
}
    `.trim();

    suite
      .add('Generic Map<K,V> resolution', {
        defer: true,
        ...benchmarkSettings,
        fn: (deferred: any) => {
          const listener = new ApexSymbolCollectorListener(undefined, 'full');
          compilerService.compile(mapCode, 'MapTest.cls', listener, {
            collectReferences: true,
            resolveReferences: true,
          });
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
});
