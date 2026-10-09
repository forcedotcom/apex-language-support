/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { beforeAll, beforeEach, describe, it } from 'vitest';

import { enableConsoleLogging, setLogLevel } from '@salesforce/apex-lsp-shared';
import { CompilerService } from '../../src/parser/compilerService';
import { ApexSymbolCollectorListener } from '../../src/parser/listeners/ApexSymbolCollectorListener';

describe('CompilerService Benchmarks', () => {
  let compilerService: CompilerService;

  const isCI = process.env.CI === 'true';
  const isQuick = process.env.QUICK === 'true';
  const benchmarkOptions = isCI
    ? { time: 30_000, warmupTime: 10_000, iterations: 5, warmupIterations: 1 }
    : isQuick
      ? { time: 1_000, warmupTime: 100, iterations: 1, warmupIterations: 1 }
      : { time: 6_000, warmupTime: 2_000, iterations: 2, warmupIterations: 1 };

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

  const compile = (
    content: string,
    fileName: string,
    options: { collectReferences: boolean; resolveReferences: boolean },
  ) => {
    const listener = new ApexSymbolCollectorListener(undefined, 'full');
    compilerService.compile(content, fileName, listener, options);
  };

  beforeAll(() => {
    enableConsoleLogging();
    setLogLevel('error');
  });

  beforeEach(() => {
    compilerService = new CompilerService();
  });

  it('benchmarks full compilation', async ({ bench }) => {
    await bench('CompilerService.compile (full)', {}, () => {
      compile(testClassContent, 'PerformanceTestClass.cls', {
        collectReferences: true,
        resolveReferences: true,
      });
    }).run(benchmarkOptions);
  });

  it('benchmarks compilation without references', async ({ bench }) => {
    await bench('CompilerService.compile (no refs)', {}, () => {
      compile(testClassContent, 'PerformanceTestClass.cls', {
        collectReferences: false,
        resolveReferences: false,
      });
    }).run(benchmarkOptions);
  });

  it('benchmarks compilation with references but no resolution', async ({
    bench,
  }) => {
    await bench('CompilerService.compile (refs, no resolve)', {}, () => {
      compile(testClassContent, 'PerformanceTestClass.cls', {
        collectReferences: true,
        resolveReferences: false,
      });
    }).run(benchmarkOptions);
  });

  it(
    'benchmarks compilation scalability with file size',
    async ({ bench }) => {
      const generateClass = (methodCount: number) => {
        const methods = Array.from(
          { length: methodCount },
          (_, index) => `
          public void method${index}() {
              System.debug('Method ${index}');
              Integer value = ${index};
              String message = 'Test';
          }
        `,
        ).join('\n');

        return `public class TestClass {${methods}}`;
      };

      const registrations = [5, 10, 20, 50].map((methodCount) => {
        const classContent = generateClass(methodCount);
        return bench(
          `CompilerService.compile (${methodCount} methods)`,
          {},
          () => {
            compile(classContent, 'TestClass.cls', {
              collectReferences: true,
              resolveReferences: true,
            });
          },
        );
      });

      await bench.compare(...registrations, benchmarkOptions);
    },
    benchmarkOptions.time * 4 + benchmarkOptions.warmupTime * 4 + 60_000,
  );
});
