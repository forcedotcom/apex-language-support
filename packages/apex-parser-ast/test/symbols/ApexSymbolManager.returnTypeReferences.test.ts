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
import { ReferenceContext } from '../../src/types/symbolReference';
import { Effect } from 'effect';

describe('ApexSymbolManager - Return Type References', () => {
  let symbolManager: ApexSymbolManager;
  let compilerService: CompilerService;

  beforeEach(() => {
    symbolManager = new ApexSymbolManager();
    compilerService = new CompilerService();
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

  describe('Method Return Type References', () => {
    it('should capture simple return type references', async () => {
      const testClass =
        "public class TestClass { public String getString() { return 'test'; } }";

      const testClassUri = await addTestClass(testClass, 'TestClass');
      const references = symbolManager.getAllReferencesInFile(testClassUri);

      // Should have a return type reference for String
      const returnTypeRefs = references.filter(
        (ref) => ref.context === ReferenceContext.RETURN_TYPE,
      );
      expect(returnTypeRefs).toHaveLength(1);
      expect(returnTypeRefs[0].name).toBe('String');
    });

    it('should capture dotted return type references', async () => {
      const testClass = `
        public class TestClass {
          public System.Url getUrl() {
            return System.Url.getOrgDomainUrl();
          }
        }
      `;

      const testClassUri = await addTestClass(testClass, 'TestClass');
      const references = symbolManager.getAllReferencesInFile(testClassUri);

      // Should have chained type references for System.Url (return type and method call)
      const chainedTypeRefs = references.filter(
        (ref) => ref.context === ReferenceContext.CHAINED_TYPE,
      );
      expect(chainedTypeRefs.length).toBeGreaterThanOrEqual(1);

      // Should have at least one System.Url reference (the return type)
      const systemUrlRefs = chainedTypeRefs.filter(
        (ref) => ref.name === 'System.Url',
      );
      expect(systemUrlRefs.length).toBeGreaterThanOrEqual(1);
    });

    it('should capture generic return type references', async () => {
      const testClass = `
        public class TestClass {
          public List<String> getStringList() {
            return new List<String>();
          }
        }
      `;

      const testClassUri = await addTestClass(testClass, 'TestClass');
      const references = symbolManager.getAllReferencesInFile(testClassUri);

      // Should have return type reference for List (the return type itself)
      // Generic type arguments (String) should only have GENERIC_PARAMETER_TYPE, not RETURN_TYPE
      const returnTypeRefs = references.filter(
        (ref) => ref.context === ReferenceContext.RETURN_TYPE,
      );
      expect(returnTypeRefs).toHaveLength(1);

      const typeNames = returnTypeRefs.map((ref) => ref.name);
      expect(typeNames).toContain('List');

      // Check for generic parameter type reference for String
      // Should have 2: one from return type List<String> and one from constructor new List<String>()
      const genericParamRefs = references.filter(
        (ref) =>
          ref.context === ReferenceContext.GENERIC_PARAMETER_TYPE &&
          ref.name === 'String',
      );
      expect(genericParamRefs.length).toBeGreaterThanOrEqual(1);
    });

    it('should capture dotted generic return type references', async () => {
      const testClass = `
        public class TestClass {
          public List<System.Url> getUrlList() {
            return new List<System.Url>();
          }
        }
      `;

      const testClassUri = await addTestClass(testClass, 'TestClass');
      const references = symbolManager.getAllReferencesInFile(testClassUri);

      // Should have return type references for List and System.Url
      const returnTypeRefs = references.filter(
        (ref) => ref.context === ReferenceContext.RETURN_TYPE,
      );
      expect(returnTypeRefs).toHaveLength(1);

      const typeNames = returnTypeRefs.map((ref) => ref.name);
      expect(typeNames).toContain('List');

      // Should have generic parameter type references for System.Url
      const genericParamRefs = references.filter(
        (ref) => ref.context === ReferenceContext.GENERIC_PARAMETER_TYPE,
      );
      expect(genericParamRefs.length).toBeGreaterThanOrEqual(1);

      // Should have at least one System.Url reference
      const systemUrlRefs = genericParamRefs.filter(
        (ref) => ref.name === 'System.Url',
      );
      expect(systemUrlRefs.length).toBeGreaterThanOrEqual(1);
    });

    it('should distinguish between return types and parameter types', async () => {
      const testClass = `
        public class TestClass {
          public System.Url processUrl(System.Url inputUrl) {
            return inputUrl;
          }
        }
      `;

      const testClassUri = await addTestClass(testClass, 'TestClass');
      const references = symbolManager.getAllReferencesInFile(testClassUri);

      // Should have chained type references for System.Url (return type)
      const chainedTypeRefs = references.filter(
        (ref) => ref.context === ReferenceContext.CHAINED_TYPE,
      );
      expect(chainedTypeRefs.length).toBeGreaterThanOrEqual(1);

      // Should have at least one System.Url reference (the return type)
      const systemUrlRefs = chainedTypeRefs.filter(
        (ref) => ref.name === 'System.Url',
      );
      expect(systemUrlRefs.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Interface Method Return Type References', () => {
    it('should capture interface method return type references', async () => {
      const testClass = `
        public interface TestInterface {
          System.Url getUrl();
        }
      `;

      const testClassUri = await addTestClass(testClass, 'TestInterface');
      const references = symbolManager.getAllReferencesInFile(testClassUri);

      // Should have a chained type reference for System.Url (dotted return types become chained)
      const chainedTypeRefs = references.filter(
        (ref) => ref.context === ReferenceContext.CHAINED_TYPE,
      );
      expect(chainedTypeRefs).toHaveLength(1);
      expect(chainedTypeRefs[0].name).toBe('System.Url');
    });
  });
});
