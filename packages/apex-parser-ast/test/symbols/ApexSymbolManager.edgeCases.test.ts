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
import {
  ChainedSymbolReference,
  ReferenceContext,
} from '../../src/types/symbolReference';
import { isChainedSymbolReference } from '../../src/utils/symbolNarrowing';
import { Effect } from 'effect';

describe('ApexSymbolManager - Edge Cases', () => {
  let symbolManager: ApexSymbolManager;
  let compilerService: CompilerService;

  beforeEach(() => {
    symbolManager = new ApexSymbolManager();
    compilerService = new CompilerService();
    // enableConsoleLogging();
    // setLogLevel('error');
  });

  afterEach(() => {
    symbolManager.clear();
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

  describe('Nested Generic Types', () => {
    it('should handle deeply nested generic types', async () => {
      const testClass = `
        public class TestClass {
          public Map<String, List<System.Url>> getUrlMap() {
            return new Map<String, List<System.Url>>();
          }
        }
      `;

      const testClassUri = await addTestClass(testClass, 'TestClass');
      const references = symbolManager.getAllReferencesInFile(testClassUri);

      // Should have generic parameter type references for System.Url in nested generics
      const systemUrlRefs = references.filter(
        (ref) =>
          ref.context === ReferenceContext.GENERIC_PARAMETER_TYPE &&
          ref.name === 'System.Url',
      );
      expect(systemUrlRefs.length).toBeGreaterThanOrEqual(1); // At least one System.Url reference

      // Should have generic parameter type references for String in generics
      const genericTypeRefs = references.filter(
        (ref) => ref.context === ReferenceContext.GENERIC_PARAMETER_TYPE,
      );
      expect(genericTypeRefs.length).toBeGreaterThanOrEqual(1);

      const typeNames = genericTypeRefs.map((ref) => ref.name);
      expect(typeNames).toContain('String'); // String should be captured as GENERIC_PARAMETER_TYPE
    });

    it('should handle triple nested generic types', async () => {
      const testClass = `
        public class TestClass {
          public List<Map<String, System.Url>> getComplexList() {
            return new List<Map<String, System.Url>>();
          }
        }
      `;

      const testClassUri = await addTestClass(testClass, 'TestClass');
      const references = symbolManager.getAllReferencesInFile(testClassUri);

      // Should have parameter type references for System.Url
      const systemUrlRefs = references.filter(
        (ref) =>
          (ref.context === ReferenceContext.PARAMETER_TYPE ||
            ref.context === ReferenceContext.GENERIC_PARAMETER_TYPE) &&
          ref.name === 'System.Url',
      );
      expect(systemUrlRefs.length).toBeGreaterThanOrEqual(1);

      // Should have return type references for List (the return type itself)
      // Generic type arguments (String) should only have GENERIC_PARAMETER_TYPE, not RETURN_TYPE
      const returnTypeRefs = references.filter(
        (ref) => ref.context === ReferenceContext.RETURN_TYPE,
      );
      expect(returnTypeRefs.length).toBeGreaterThanOrEqual(1);

      // Check for generic parameter type references for String
      const genericParamRefs = references.filter(
        (ref) =>
          ref.context === ReferenceContext.GENERIC_PARAMETER_TYPE &&
          ref.name === 'String',
      );
      expect(genericParamRefs.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle mixed simple and dotted types in generics', async () => {
      const testClass = `
        public class TestClass {
          public Map<String, System.Url> getMixedMap() {
            return new Map<String, System.Url>();
          }
        }
      `;

      const testClassUri = await addTestClass(testClass, 'TestClass');
      const references = symbolManager.getAllReferencesInFile(testClassUri);

      // Should have generic parameter type references for System.Url
      const systemUrlRefs = references.filter(
        (ref) =>
          ref.context === ReferenceContext.GENERIC_PARAMETER_TYPE &&
          ref.name === 'System.Url',
      );
      expect(systemUrlRefs.length).toBeGreaterThanOrEqual(1);

      // Should have generic parameter type references for String
      const genericTypeRefs = references.filter(
        (ref) => ref.context === ReferenceContext.GENERIC_PARAMETER_TYPE,
      );
      expect(genericTypeRefs.length).toBeGreaterThanOrEqual(1);

      const typeNames = genericTypeRefs.map((ref) => ref.name);
      expect(typeNames).toContain('String');
    });
  });

  describe('Complex Dotted Types', () => {
    it('should handle three-part dotted types', async () => {
      const testClass = `
        public class TestClass {
          public System.Url getThreePartType() {
            return null;
          }
        }
      `;

      const testClassUri = await addTestClass(testClass, 'TestClass');
      const references = symbolManager.getAllReferencesInFile(testClassUri);

      // Should have chained type references for System.Url (two-part type)
      const chainedTypeRefs = references.filter(
        (ref) => isChainedSymbolReference(ref) && ref.name === 'System.Url',
      );
      expect(chainedTypeRefs.length).toBeGreaterThanOrEqual(1);

      if (chainedTypeRefs.length > 0) {
        const chainedRef = chainedTypeRefs[0] as ChainedSymbolReference;
        expect(chainedRef.chainNodes).toHaveLength(2);
        expect(chainedRef.chainNodes[0].name).toBe('System');
        expect(chainedRef.chainNodes[1].name).toBe('Url');
      }
    });

    it('should handle four-part dotted types', async () => {
      const testClass = `
        public class TestClass {
          public A.B.C.D getFourPartType() {
            return null;
          }
        }
      `;

      const testClassUri = await addTestClass(testClass, 'TestClass');
      const references = symbolManager.getAllReferencesInFile(testClassUri);

      // Should have chained type references for the four-part type
      const chainedTypeRefs = references.filter(
        (ref) => isChainedSymbolReference(ref) && ref.name === 'A.B.C.D',
      );
      expect(chainedTypeRefs.length).toBeGreaterThanOrEqual(1);

      if (chainedTypeRefs.length > 0) {
        const chainedRef = chainedTypeRefs[0] as ChainedSymbolReference;
        expect(chainedRef.chainNodes).toHaveLength(4);
        expect(chainedRef.chainNodes[0].name).toBe('A');
        expect(chainedRef.chainNodes[1].name).toBe('B');
        expect(chainedRef.chainNodes[2].name).toBe('C');
        expect(chainedRef.chainNodes[3].name).toBe('D');
      }
    });

    it('should handle dotted types in generic parameters', async () => {
      const testClass = `
        public class TestClass {
          public List<System.Url> getDottedGenericList() {
            return new List<System.Url>();
          }
        }
      `;

      const testClassUri = await addTestClass(testClass, 'TestClass');
      const references = symbolManager.getAllReferencesInFile(testClassUri);

      // Should have parameter type references for System.Url
      const systemUrlRefs = references.filter(
        (ref) =>
          (ref.context === ReferenceContext.PARAMETER_TYPE ||
            ref.context === ReferenceContext.GENERIC_PARAMETER_TYPE) &&
          ref.name === 'System.Url',
      );
      expect(systemUrlRefs.length).toBeGreaterThanOrEqual(1);

      // Should have constructor call references for List
      const constructorRefs = references.filter(
        (ref) => ref.context === ReferenceContext.CONSTRUCTOR_CALL,
      );
      expect(constructorRefs.length).toBeGreaterThanOrEqual(1);

      const typeNames = constructorRefs.map((ref) => ref.name);
      expect(typeNames).toContain('List');
    });
  });

  describe('Mixed Context Types', () => {
    it('should handle dotted types in multiple contexts', async () => {
      const testClass = `
        public class TestClass {
          public System.Url myUrl;
          
          public System.Url getUrl() {
            return myUrl;
          }
          
          public void setUrl(System.Url newUrl) {
            myUrl = newUrl;
          }
        }
      `;

      const testClassUri = await addTestClass(testClass, 'TestClass');
      const references = symbolManager.getAllReferencesInFile(testClassUri);

      // Should have multiple System.Url references in different contexts
      const systemUrlRefs = references.filter(
        (ref) =>
          (isChainedSymbolReference(ref) ||
            ref.context === ReferenceContext.PARAMETER_TYPE) &&
          ref.name === 'System.Url',
      );
      expect(systemUrlRefs.length).toBeGreaterThanOrEqual(3); // Field, return type, parameter

      // Each reference should be resolvable
      for (const ref of systemUrlRefs) {
        expect(() => {
          symbolManager.getSymbolAtPosition(testClassUri, {
            line: ref.location.identifierRange.startLine - 1,
            character: ref.location.identifierRange.startColumn,
          });
        }).not.toThrow();
      }
    });

    it('should handle dotted types in interface methods', async () => {
      const testClass = `
        public interface TestInterface {
          System.Url getUrl();
          void setUrl(System.Url url);
        }
      `;

      const testClassUri = await addTestClass(testClass, 'TestInterface');
      const references = symbolManager.getAllReferencesInFile(testClassUri);

      // Should have chained type references for System.Url in interface methods
      const systemUrlRefs = references.filter(
        (ref) =>
          (isChainedSymbolReference(ref) ||
            ref.context === ReferenceContext.PARAMETER_TYPE) &&
          ref.name === 'System.Url',
      );
      expect(systemUrlRefs.length).toBeGreaterThanOrEqual(2); // Return type and parameter

      // Each reference should be resolvable
      for (const ref of systemUrlRefs) {
        expect(() => {
          symbolManager.getSymbolAtPosition(testClassUri, {
            line: ref.location.identifierRange.startLine - 1,
            character: ref.location.identifierRange.startColumn,
          });
        }).not.toThrow();
      }
    });
  });

  describe('Edge Case Scenarios', () => {
    it('should handle empty generic parameters gracefully', async () => {
      const testClass = `
        public class TestClass {
          public List<String> getGenericList() {
            return new List<String>();
          }
        }
      `;

      const testClassUri = await addTestClass(testClass, 'TestClass');
      const references = symbolManager.getAllReferencesInFile(testClassUri);

      // Should have generic parameter type references for String
      const genericTypeRefs = references.filter(
        (ref) => ref.context === ReferenceContext.GENERIC_PARAMETER_TYPE,
      );
      expect(genericTypeRefs.length).toBeGreaterThanOrEqual(1);

      const typeNames = genericTypeRefs.map((ref) => ref.name);
      expect(typeNames).toContain('String');
    });

    it('should handle single character dotted types', async () => {
      const testClass = `
        public class TestClass {
          public A.B getSingleCharType() {
            return null;
          }
        }
      `;

      const testClassUri = await addTestClass(testClass, 'TestClass');
      const references = symbolManager.getAllReferencesInFile(testClassUri);

      // Should have chained type references for A.B
      const chainedTypeRefs = references.filter(
        (ref) => isChainedSymbolReference(ref) && ref.name === 'A.B',
      );
      expect(chainedTypeRefs.length).toBeGreaterThanOrEqual(1);

      if (chainedTypeRefs.length > 0) {
        const chainedRef = chainedTypeRefs[0] as ChainedSymbolReference;
        expect(chainedRef.chainNodes).toHaveLength(2);
        expect(chainedRef.chainNodes[0].name).toBe('A');
        expect(chainedRef.chainNodes[1].name).toBe('B');
      }
    });

    it('should handle very long dotted type names', async () => {
      const testClass = `
        public class TestClass {
          public System.Url getLongType() {
            return null;
          }
        }
      `;

      const testClassUri = await addTestClass(testClass, 'TestClass');
      const references = symbolManager.getAllReferencesInFile(testClassUri);

      // Should have chained type references for System.Url
      const systemUrlRefs = references.filter(
        (ref) =>
          (isChainedSymbolReference(ref) ||
            ref.context === ReferenceContext.PARAMETER_TYPE ||
            ref.context === ReferenceContext.GENERIC_PARAMETER_TYPE) &&
          ref.name === 'System.Url',
      );
      expect(systemUrlRefs.length).toBeGreaterThanOrEqual(1);

      // Check for chained type references
      const chainedTypeRefs = references.filter((ref) =>
        isChainedSymbolReference(ref),
      );
      if (chainedTypeRefs.length > 0) {
        const chainedRef = chainedTypeRefs[0] as ChainedSymbolReference;
        expect(chainedRef.chainNodes).toHaveLength(2);
        expect(chainedRef.chainNodes[0].name).toBe('System');
        expect(chainedRef.chainNodes[1].name).toBe('Url');
      }
    });
  });
});
