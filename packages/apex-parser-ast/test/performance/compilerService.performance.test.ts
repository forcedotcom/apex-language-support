/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Performance tests for CompilerService compilation phases.
 *
 * These tests break down the compilation process into sub-phases to identify
 * which specific operations are causing event loop blocking:
 *
 * Compilation phases measured:
 * 1. Parsing (lexer + parser → parse tree)
 * 2. Symbol collection (tree walk + listener)
 * 3. Reference collection (tree walk + reference collector)
 * 4. Reference resolution (resolve references in symbol table)
 * 5. Comment collection and association
 *
 * Focus: Identify CPU-intensive phases that block the event loop
 */

import { CompilerService } from '../../src/parser/compilerService';
import { ApexSymbolCollectorListener } from '../../src/parser/listeners/ApexSymbolCollectorListener';
import {
  measureSyncBlocking,
  formatTimingResult,
  getLogger,
  enableConsoleLogging,
  setLogLevel,
  type LoggerInterface,
} from '@salesforce/apex-lsp-shared';

describe('CompilerService - Performance Tests', () => {
  let compilerService: CompilerService;
  let logger: LoggerInterface;

  // Test fixture - use a moderately complex class
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
    setLogLevel('error'); // Reduce noise in performance tests
  });

  beforeEach(() => {
    logger = getLogger();
    compilerService = new CompilerService();
  });

  describe('Overall Compilation Performance', () => {
    it('measures full compilation with blocking detection', () => {
      const listener = new ApexSymbolCollectorListener(undefined, 'full');

      const timing = measureSyncBlocking('compile-full', () =>
        compilerService.compile(
          testClassContent,
          'PerformanceTestClass.cls',
          listener,
          {
            collectReferences: true,
            resolveReferences: true,
          },
        ),
      );

      logger.info('\n=== Full Compilation Performance ===');
      logger.info(formatTimingResult(timing));
      logger.info(`Duration: ${timing.durationMs.toFixed(2)}ms`);
      logger.info(`Blocking: ${timing.isBlocking ? 'YES ⚠️' : 'NO ✓'}`);

      expect(timing.result).toBeDefined();
      expect(timing.result.errors).toHaveLength(0);
    });

    it('measures compilation with multiple iterations to identify variance', () => {
      const iterations = 5;
      const timings: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const listener = new ApexSymbolCollectorListener(undefined, 'full');

        const timing = measureSyncBlocking(`compile-iteration-${i + 1}`, () =>
          compilerService.compile(
            testClassContent,
            'PerformanceTestClass.cls',
            listener,
            {
              collectReferences: true,
              resolveReferences: true,
            },
          ),
        );

        timings.push(timing.durationMs);
      }

      const avgTime = timings.reduce((a, b) => a + b, 0) / timings.length;
      const minTime = Math.min(...timings);
      const maxTime = Math.max(...timings);
      const stdDev = Math.sqrt(
        timings.reduce((sum, t) => sum + Math.pow(t - avgTime, 2), 0) /
          timings.length,
      );

      logger.info('\n=== Compilation Performance Statistics ===');
      logger.info(`Iterations: ${iterations}`);
      logger.info(`Average: ${avgTime.toFixed(2)}ms`);
      logger.info(`Min: ${minTime.toFixed(2)}ms`);
      logger.info(`Max: ${maxTime.toFixed(2)}ms`);
      logger.info(`Std Dev: ${stdDev.toFixed(2)}ms`);
      logger.info(
        `Variance range: ${maxTime - minTime}ms (${(((maxTime - minTime) / avgTime) * 100).toFixed(1)}%)`,
      );

      // Expect relatively consistent performance (allow up to 100% variance for JIT warmup)
      expect(maxTime - minTime).toBeLessThan(avgTime * 1.0);
    });
  });

  describe('Compilation Phase Breakdown', () => {
    it('measures compilation without references collection', () => {
      const listener = new ApexSymbolCollectorListener(undefined, 'full');

      const timing = measureSyncBlocking('compile-no-refs', () =>
        compilerService.compile(
          testClassContent,
          'PerformanceTestClass.cls',
          listener,
          {
            collectReferences: false,
            resolveReferences: false,
          },
        ),
      );

      logger.info('\n=== Compilation Without References ===');
      logger.info(formatTimingResult(timing));

      expect(timing.result).toBeDefined();
    });

    it('measures compilation with references but without resolution', () => {
      const listener = new ApexSymbolCollectorListener(undefined, 'full');

      const timing = measureSyncBlocking('compile-refs-no-resolve', () =>
        compilerService.compile(
          testClassContent,
          'PerformanceTestClass.cls',
          listener,
          {
            collectReferences: true,
            resolveReferences: false,
          },
        ),
      );

      logger.info('\n=== Compilation With References (No Resolution) ===');
      logger.info(formatTimingResult(timing));

      expect(timing.result).toBeDefined();
    });

    it('compares compilation cost with different options', () => {
      const scenarios = [
        {
          name: 'Basic (no refs)',
          options: { collectReferences: false, resolveReferences: false },
        },
        {
          name: 'Collect refs',
          options: { collectReferences: true, resolveReferences: false },
        },
        {
          name: 'Full (collect + resolve)',
          options: { collectReferences: true, resolveReferences: true },
        },
      ];

      const results: Array<{ name: string; durationMs: number }> = [];

      for (const scenario of scenarios) {
        const listener = new ApexSymbolCollectorListener(undefined, 'full');

        const timing = measureSyncBlocking(scenario.name, () =>
          compilerService.compile(
            testClassContent,
            'PerformanceTestClass.cls',
            listener,
            scenario.options,
          ),
        );

        results.push({
          name: scenario.name,
          durationMs: timing.durationMs,
        });
      }

      logger.info('\n=== Compilation Options Performance Comparison ===');
      results.forEach((result, index) => {
        const baseline = results[0].durationMs;
        const overheadMs = (result.durationMs - baseline).toFixed(2);
        const overheadPct = ((result.durationMs / baseline - 1) * 100).toFixed(
          1,
        );
        const overhead =
          index > 0
            ? `(+${overheadMs}ms, ${overheadPct}% overhead)`
            : '(baseline)';
        logger.info(
          `${result.name}: ${result.durationMs.toFixed(2)}ms ${overhead}`,
        );
      });

      // Expect overhead for references
      expect(results[2].durationMs).toBeGreaterThan(results[0].durationMs);
    });
  });

  describe('File Size Impact', () => {
    it('measures compilation time for different file sizes', () => {
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
      const results: Array<{
        methods: number;
        size: number;
        durationMs: number;
      }> = [];

      for (const methodCount of sizes) {
        const classContent = generateClass(methodCount);
        const listener = new ApexSymbolCollectorListener(undefined, 'full');

        const timing = measureSyncBlocking(`methods-${methodCount}`, () =>
          compilerService.compile(classContent, 'TestClass.cls', listener, {
            collectReferences: true,
            resolveReferences: true,
          }),
        );

        results.push({
          methods: methodCount,
          size: classContent.length,
          durationMs: timing.durationMs,
        });
      }

      logger.info('\n=== File Size Impact on Compilation ===');
      results.forEach((result) => {
        const msPerMethod = (result.durationMs / result.methods).toFixed(2);
        const duration = result.durationMs.toFixed(2);
        logger.info(
          `${result.methods} methods (${result.size} bytes): ${duration}ms ` +
            `(${msPerMethod}ms/method)`,
        );
      });

      // Expect roughly linear growth
      const firstRate = results[0].durationMs / results[0].methods;
      const lastRate =
        results[results.length - 1].durationMs /
        results[results.length - 1].methods;
      const growthFactor = lastRate / firstRate;

      logger.info(`Growth factor: ${growthFactor.toFixed(2)}x`);

      // Growth should be roughly linear (< 2x) due to parser efficiency
      expect(growthFactor).toBeLessThan(2.0);
    });
  });

  describe('Performance Baseline', () => {
    it('generates baseline data for compiler service', () => {
      const listener = new ApexSymbolCollectorListener(undefined, 'full');

      const timing = measureSyncBlocking('compiler-baseline', () =>
        compilerService.compile(
          testClassContent,
          'PerformanceTestClass.cls',
          listener,
          {
            collectReferences: true,
            resolveReferences: true,
          },
        ),
      );

      const baselineData = {
        operation: 'CompilerService.compile',
        fileSize: testClassContent.length,
        duration: timing.durationMs,
        isBlocking: timing.isBlocking,
        environment: timing.environment,
        options: {
          collectReferences: true,
          resolveReferences: true,
        },
        timestamp: new Date().toISOString(),
      };

      logger.info('\n=== Compiler Service Performance Baseline ===');
      logger.info(JSON.stringify(baselineData, null, 2));
      logger.info('===========================================\n');

      expect(timing.result).toBeDefined();
    });
  });
});
