/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ApexSymbolManager } from '../../src/symbols/ApexSymbolManager';
import { CompilerService } from '../../src/parser/compilerService';
import { ApexSymbolCollectorListener } from '../../src/parser/listeners/ApexSymbolCollectorListener';
import { SymbolReferenceFactory } from '../../src/types/symbolReference';
import { Effect } from 'effect';

describe.skip('ApexSymbolManager - Performance Optimization', () => {
  let symbolManager: ApexSymbolManager;
  let compilerService: CompilerService;

  beforeEach(() => {
    symbolManager = new ApexSymbolManager();
    compilerService = new CompilerService();
    // Clear caches before each test
    SymbolReferenceFactory.clearCaches();
  });

  afterEach(() => {
    symbolManager.clear();
    SymbolReferenceFactory.clearCaches();
  });

  const addTestClass = async (sourceCode: string, className: string) => {
    const testClassUri = `file:///test/${className}.cls`;
    const listener = new ApexSymbolCollectorListener(undefined, 'full');
    const result = compilerService.compile(sourceCode, testClassUri, listener);

    if (result.result) {
      await Effect.runPromise(
        symbolManager.addSymbolTable(result.result, testClassUri),
      );
    }

    return testClassUri;
  };

  describe('Type Name Parsing Caching', () => {
    it('should cache parsed type names for repeated use', async () => {
      const testClass = `
        public class TestClass {
          public System.Url getUrl1() { return null; }
          public System.Url getUrl2() { return null; }
          public System.Url getUrl3() { return null; }
          public void setUrl1(System.Url url) { }
          public void setUrl2(System.Url url) { }
          public void setUrl3(System.Url url) { }
        }
      `;

      await addTestClass(testClass, 'TestClass');

      // Get cache stats after processing
      const cacheStats = SymbolReferenceFactory.getCacheStats();

      // Should have cached the parsed type name "System.Url"
      expect(cacheStats.typeNameCacheSize).toBeGreaterThan(0);

      // The same type name should be cached and reused
      expect(cacheStats.typeNameCacheSize).toBe(1); // Only "System.Url" should be cached
    });

    it('should handle multiple different type names', async () => {
      const testClass = `
        public class TestClass {
          public System.Url getUrl() { return null; }
          public System.String getString() { return null; }
          public Custom.Namespace.Class getCustom() { return null; }
        }
      `;

      await addTestClass(testClass, 'TestClass');

      // Get cache stats after processing
      const cacheStats = SymbolReferenceFactory.getCacheStats();

      // Should have cached multiple different type names
      expect(cacheStats.typeNameCacheSize).toBeGreaterThan(1);
    });

    it('should clear caches when requested', async () => {
      const testClass = `
        public class TestClass {
          public System.Url getUrl() { return null; }
        }
      `;

      await addTestClass(testClass, 'TestClass');

      // Verify cache has entries
      let cacheStats = SymbolReferenceFactory.getCacheStats();
      expect(cacheStats.typeNameCacheSize).toBeGreaterThan(0);

      // Clear caches
      SymbolReferenceFactory.clearCaches();

      // Verify caches are empty
      cacheStats = SymbolReferenceFactory.getCacheStats();
      expect(cacheStats.typeNameCacheSize).toBe(0);
      expect(cacheStats.chainedTypeCacheSize).toBe(0);
    });
  });

  describe('Performance with Large Codebases', () => {
    it('should handle many repeated type references efficiently', async () => {
      // Create a test class with many repeated System.Url references
      const methods = Array.from(
        { length: 50 },
        (_, i) => `public System.Url getUrl${i}() { return null; }`,
      ).join('\n          ');

      const parameters = Array.from(
        { length: 50 },
        (_, i) => `public void setUrl${i}(System.Url url) { }`,
      ).join('\n          ');

      const testClass = `
        public class TestClass {
          ${methods}
          ${parameters}
        }
      `;

      const startTime = Date.now();
      await addTestClass(testClass, 'TestClass');
      const endTime = Date.now();

      // Should complete in reasonable time (less than 5 seconds)
      expect(endTime - startTime).toBeLessThan(5000);

      // Cache should be efficient (only one entry for "System.Url")
      const cacheStats = SymbolReferenceFactory.getCacheStats();
      expect(cacheStats.typeNameCacheSize).toBe(1);
    });

    it('should handle complex nested generic types efficiently', async () => {
      const testClass = `
        public class TestClass {
          public Map<String, List<System.Url>> getComplex1() { return null; }
          public Map<String, List<System.Url>> getComplex2() { return null; }
          public Map<String, List<System.Url>> getComplex3() { return null; }
          public List<Map<String, System.Url>> getComplex4() { return null; }
          public List<Map<String, System.Url>> getComplex5() { return null; }
        }
      `;

      const startTime = Date.now();
      await addTestClass(testClass, 'TestClass');
      const endTime = Date.now();

      // Should complete in reasonable time
      expect(endTime - startTime).toBeLessThan(2000);

      // Should have cached the parsed type names
      const cacheStats = SymbolReferenceFactory.getCacheStats();
      expect(cacheStats.typeNameCacheSize).toBeGreaterThan(0);
    });
  });

  describe('Memory Management', () => {
    it('should not accumulate excessive cache entries', async () => {
      // Process multiple files with different type names
      const files = [
        'public class TestClass1 { public System.Url getUrl() { return null; } }',
        'public class TestClass2 { public System.String getString() { return null; } }',
        'public class TestClass3 { public Custom.Namespace.Class getCustom() { return null; } }',
      ];

      for (let i = 0; i < files.length; i++) {
        await addTestClass(files[i], `TestClass${i + 1}`);
      }

      // Cache should have reasonable size
      const cacheStats = SymbolReferenceFactory.getCacheStats();
      expect(cacheStats.typeNameCacheSize).toBeLessThan(10); // Should not accumulate too many entries
    });

    it('should handle cache clearing without errors', async () => {
      const testClass = `
        public class TestClass {
          public System.Url getUrl() { return null; }
        }
      `;

      await addTestClass(testClass, 'TestClass');

      // Clear caches multiple times
      SymbolReferenceFactory.clearCaches();
      SymbolReferenceFactory.clearCaches();
      SymbolReferenceFactory.clearCaches();

      // Should not throw errors and caches should remain empty
      const cacheStats = SymbolReferenceFactory.getCacheStats();
      expect(cacheStats.typeNameCacheSize).toBe(0);
      expect(cacheStats.chainedTypeCacheSize).toBe(0);
    });
  });
});
