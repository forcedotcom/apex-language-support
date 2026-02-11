/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * CompilerService Performance Benchmarks
 *
 * These benchmarks measure compilation performance to track trends over time:
 * 1. Full compilation (parsing + symbol collection + reference resolution)
 * 2. Compilation without references
 * 3. Compilation with references but no resolution
 * 4. File size impact (scaling)
 *
 * Focus: Track compilation performance and identify regressions
 */

import Benchmark from 'benchmark';
import { CompilerService } from '../../src/parser/compilerService';
import { ApexSymbolCollectorListener } from '../../src/parser/listeners/ApexSymbolCollectorListener';
import { enableConsoleLogging, setLogLevel } from '@salesforce/apex-lsp-shared';

describe('CompilerService Benchmarks', () => {
  let compilerService: CompilerService;

  // Benchmark modes: QUICK=true (validation), LOCAL (default), CI (comprehensive)
  const isCI = process.env.CI === 'true';
  const isQuick = process.env.QUICK === 'true';
  const benchmarkSettings = isCI
    ? { maxTime: 30, minTime: 10, minSamples: 5, initCount: 1 } // CI: comprehensive
    : isQuick
      ? { maxTime: 1, minTime: 0.1, minSamples: 1, initCount: 1 } // QUICK: fast validation
      : { maxTime: 6, minTime: 2, minSamples: 2, initCount: 1 }; // LOCAL: balanced

  if (isQuick) {
    console.log('⚡ QUICK mode: Running minimal samples for fast validation');
  } else if (isCI) {
    console.log('🏗️  CI mode: Running comprehensive benchmarks');
  } else {
    console.log('💻 LOCAL mode: Running balanced benchmarks');
  }

  // Test fixture - moderately complex class
  const testClassContent = `
public class PerformanceTestClass {
    private static final String CONSTANT_VALUE = 'Test';
    private Integer counter = 0;
    
    public class InnerClass {
        private String name;
        
        public InnerClass(String name) {
            this.name = name;
        }
        
        public String getName() {
            return this.name;
        }
    }
    
    public PerformanceTestClass() {
        this.counter = 0;
    }
    
    public PerformanceTestClass(Integer initialValue) {
        this.counter = initialValue;
    }
    
    public void increment() {
        this.counter++;
    }
    
    public Integer getCounter() {
        return this.counter;
    }
    
    public String processString(String input) {
        if (String.isBlank(input)) {
            return CONSTANT_VALUE;
        }
        return input.toUpperCase();
    }
    
    public List<String> createList() {
        List<String> result = new List<String>();
        result.add('First');
        result.add('Second');
        result.add('Third');
        return result;
    }
    
    public Map<String, Integer> createMap() {
        Map<String, Integer> result = new Map<String, Integer>();
        result.put('one', 1);
        result.put('two', 2);
        result.put('three', 3);
        return result;
    }
    
    public void processCollection() {
        List<String> items = createList();
        Map<String, Integer> counts = createMap();
        
        for (String item : items) {
            System.debug('Item: ' + item);
        }
        
        for (String key : counts.keySet()) {
            System.debug(key + ' = ' + counts.get(key));
        }
    }
    
    public static void staticMethod() {
        System.debug('Static method called');
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

  jest.setTimeout(1000 * 60 * 10); // 10 minute timeout for benchmarks

  it('benchmarks full compilation', (done) => {
    const suite = new Benchmark.Suite();
    const results: Record<string, Benchmark.Target> = {};

    suite
      .add('CompilerService.compile (full)', {
        defer: true,
        ...benchmarkSettings,
        fn: (deferred: any) => {
          const listener = new ApexSymbolCollectorListener(undefined, 'full');
          compilerService.compile(
            testClassContent,
            'PerformanceTestClass.cls',
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

        // Merge with existing results
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

  it('benchmarks compilation without references', (done) => {
    const suite = new Benchmark.Suite();
    const results: Record<string, Benchmark.Target> = {};

    suite
      .add('CompilerService.compile (no refs)', {
        defer: true,
        ...benchmarkSettings,
        fn: (deferred: any) => {
          const listener = new ApexSymbolCollectorListener(undefined, 'full');
          compilerService.compile(
            testClassContent,
            'PerformanceTestClass.cls',
            listener,
            {
              collectReferences: false,
              resolveReferences: false,
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

  it('benchmarks compilation with references but no resolution', (done) => {
    const suite = new Benchmark.Suite();
    const results: Record<string, Benchmark.Target> = {};

    suite
      .add('CompilerService.compile (refs, no resolve)', {
        defer: true,
        ...benchmarkSettings,
        fn: (deferred: any) => {
          const listener = new ApexSymbolCollectorListener(undefined, 'full');
          compilerService.compile(
            testClassContent,
            'PerformanceTestClass.cls',
            listener,
            {
              collectReferences: true,
              resolveReferences: false,
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

  it('benchmarks compilation scalability with file size', (done) => {
    const suite = new Benchmark.Suite();
    const results: Record<string, Benchmark.Target> = {};

    // Generate test classes of different sizes
    const generateClass = (methodCount: number): string => {
      const methods = Array.from(
        { length: methodCount },
        (_, i) => `
          public void method${i}() {
              System.debug('Method ${i}');
              Integer value = ${i};
              String message = 'Test';
          }
        `,
      ).join('\n');

      return `
          public class TestClass {
              ${methods}
          }
        `.trim();
    };

    const sizes = [5, 10, 20, 50];

    // Add benchmark for each size
    sizes.forEach((methodCount) => {
      const classContent = generateClass(methodCount);

      suite.add(`CompilerService.compile (${methodCount} methods)`, {
        defer: true,
        ...benchmarkSettings,
        fn: (deferred: any) => {
          const listener = new ApexSymbolCollectorListener(undefined, 'full');
          compilerService.compile(classContent, 'TestClass.cls', listener, {
            collectReferences: true,
            resolveReferences: true,
          });
          deferred.resolve();
        },
      });
    });

    suite
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
