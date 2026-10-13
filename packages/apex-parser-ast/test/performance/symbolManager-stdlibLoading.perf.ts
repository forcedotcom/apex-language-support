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

describe('ApexSymbolManager - Standard Library Loading Benchmarks', () => {
  let compilerService: CompilerService;

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

  const compile = (content: string, fileName: string) => {
    const listener = new ApexSymbolCollectorListener(undefined, 'full');
    compilerService.compile(content, fileName, listener, {
      collectReferences: true,
      resolveReferences: true,
    });
  };

  beforeAll(() => {
    enableConsoleLogging();
    setLogLevel('error');
  });

  beforeEach(() => {
    compilerService = new CompilerService();
  });

  it('benchmarks compilation with standard library cold start', async ({
    bench,
  }) => {
    await bench('Compilation with stdlib cold start', {}, () => {
      const freshCompiler = new CompilerService();
      const listener = new ApexSymbolCollectorListener(undefined, 'full');
      freshCompiler.compile(codeWithStdLibUsage, 'TestClass.cls', listener, {
        collectReferences: true,
        resolveReferences: true,
      });
    }).run();
  });

  it('benchmarks compilation with cached standard library', async ({
    bench,
  }) => {
    compile(codeWithStdLibUsage, 'Warmup.cls');
    await bench('Compilation with stdlib cached', {}, () => {
      compile(codeWithStdLibUsage, 'TestClass.cls');
    }).run();
  });

  it('benchmarks generic type resolution (List<T>)', async ({ bench }) => {
    const listCode = `
public class ListTest {
    public void testGenericList() {
        List<String> strings = new List<String>();
        List<Integer> numbers = new List<Integer>();
        List<Account> accounts = new List<Account>();
    }
}
    `.trim();

    await bench('Generic List<T> resolution', {}, () => {
      compile(listCode, 'ListTest.cls');
    }).run();
  });

  it('benchmarks generic type resolution (Map<K,V>)', async ({ bench }) => {
    const mapCode = `
public class MapTest {
    public void testGenericMap() {
        Map<String, Integer> counts = new Map<String, Integer>();
        Map<Id, Account> accountMap = new Map<Id, Account>();
    }
}
    `.trim();

    await bench('Generic Map<K,V> resolution', {}, () => {
      compile(mapCode, 'MapTest.cls');
    }).run();
  });
});
