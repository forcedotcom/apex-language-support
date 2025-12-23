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

describe('ApexSymbolManager - Parameter Type References', () => {
  let symbolManager: ApexSymbolManager;
  let compilerService: CompilerService;

  beforeEach(() => {
    symbolManager = new ApexSymbolManager();
    compilerService = new CompilerService();
  });

  afterEach(() => {
    symbolManager.clear();
  });

  const addTestClass = (sourceCode: string, className: string) => {
    const testClassUri = `file:///test/${className}.cls`;
    const listener = new ApexSymbolCollectorListener();
    const result = compilerService.compile(sourceCode, testClassUri, listener);

    if (result.result) {
      symbolManager.addSymbolTable(result.result, testClassUri);
    }

    return testClassUri;
  };

  describe('Method Parameter Type References', () => {
    it('should capture simple parameter type references', () => {
      const testClass =
        'public class TestClass { public void processString(String input) { } }';

      const testClassUri = addTestClass(testClass, 'TestClass');
      const references = symbolManager.getAllReferencesInFile(testClassUri);

      // Should have a parameter type reference for String
      const paramTypeRefs = references.filter(
        (ref) => ref.context === ReferenceContext.PARAMETER_TYPE,
      );
      expect(paramTypeRefs).toHaveLength(1);
      expect(paramTypeRefs[0].name).toBe('String');
    });

    it('should capture dotted parameter type references', () => {
      const testClass = `
        public class TestClass {
          public void processUrl(System.Url inputUrl) {
            // Method body
          }
        }
      `;

      const testClassUri = addTestClass(testClass, 'TestClass');
      const references = symbolManager.getAllReferencesInFile(testClassUri);

      // Should have a chained type reference for System.Url parameter
      const chainedTypeRefs = references.filter(
        (ref) => ref.context === ReferenceContext.CHAINED_TYPE,
      );
      expect(chainedTypeRefs.length).toBeGreaterThanOrEqual(1);

      // Should have at least one System.Url reference (the parameter type)
      const systemUrlRefs = chainedTypeRefs.filter(
        (ref) => ref.name === 'System.Url',
      );
      expect(systemUrlRefs.length).toBeGreaterThanOrEqual(1);
    });

    it('should capture generic parameter type references', () => {
      const testClass = `
        public class TestClass {
          public void processList(List<String> inputList) {
            // Method body
          }
        }
      `;

      const testClassUri = addTestClass(testClass, 'TestClass');
      const references = symbolManager.getAllReferencesInFile(testClassUri);

      // Should have parameter type reference for List (the parameter type itself)
      // Generic type arguments (String) should only have GENERIC_PARAMETER_TYPE, not PARAMETER_TYPE
      const paramTypeRefs = references.filter(
        (ref) => ref.context === ReferenceContext.PARAMETER_TYPE,
      );
      expect(paramTypeRefs).toHaveLength(1);

      const typeNames = paramTypeRefs.map((ref) => ref.name);
      expect(typeNames).toContain('List');

      // Check for generic parameter type reference for String
      const genericParamRefs = references.filter(
        (ref) =>
          ref.context === ReferenceContext.GENERIC_PARAMETER_TYPE &&
          ref.name === 'String',
      );
      expect(genericParamRefs).toHaveLength(1);
    });

    it('should capture dotted generic parameter type references', () => {
      const testClass = `
        public class TestClass {
          public void processUrlList(List<System.Url> inputUrlList) {
            // Method body
          }
        }
      `;

      const testClassUri = addTestClass(testClass, 'TestClass');
      const references = symbolManager.getAllReferencesInFile(testClassUri);

      // Should have parameter type references for List
      const paramTypeRefs = references.filter(
        (ref) => ref.context === ReferenceContext.PARAMETER_TYPE,
      );
      expect(paramTypeRefs).toHaveLength(1);

      const typeNames = paramTypeRefs.map((ref) => ref.name);
      expect(typeNames).toContain('List');

      // Should also have a generic parameter type reference for System.Url (dotted generic parameter)
      // Dotted type names in generic arguments are captured as GENERIC_PARAMETER_TYPE
      const genericParamRefs = references.filter(
        (ref) =>
          ref.context === ReferenceContext.GENERIC_PARAMETER_TYPE &&
          ref.name === 'System.Url',
      );
      expect(genericParamRefs).toHaveLength(1);
    });

    it('should distinguish between return types and parameter types', () => {
      const testClass = `
        public class TestClass {
          public System.Url processUrl(System.Url inputUrl) {
            return inputUrl;
          }
        }
      `;

      const testClassUri = addTestClass(testClass, 'TestClass');
      const references = symbolManager.getAllReferencesInFile(testClassUri);

      // Should have chained type references for System.Url (both return and parameter)
      const chainedTypeRefs = references.filter(
        (ref) => ref.context === ReferenceContext.CHAINED_TYPE,
      );
      expect(chainedTypeRefs.length).toBeGreaterThanOrEqual(2);

      // Should have at least two System.Url references (return type and parameter)
      const systemUrlRefs = chainedTypeRefs.filter(
        (ref) => ref.name === 'System.Url',
      );
      expect(systemUrlRefs.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Field Type References', () => {
    it('should capture dotted field type references', () => {
      const testClass = `
        public class TestClass {
          public System.Url myUrl;
        }
      `;

      const testClassUri = addTestClass(testClass, 'TestClass');
      const references = symbolManager.getAllReferencesInFile(testClassUri);

      // Should have a chained type reference for System.Url field type
      const chainedTypeRefs = references.filter(
        (ref) => ref.context === ReferenceContext.CHAINED_TYPE,
      );
      expect(chainedTypeRefs.length).toBeGreaterThanOrEqual(1);

      // Should have at least one System.Url reference (the field type)
      const systemUrlRefs = chainedTypeRefs.filter(
        (ref) => ref.name === 'System.Url',
      );
      expect(systemUrlRefs.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Local Variable Type References', () => {
    it('should capture dotted local variable type references', () => {
      const testClass = `
        public class TestClass {
          public void testMethod() {
            System.Url localUrl = System.Url.getOrgDomainUrl();
          }
        }
      `;

      const testClassUri = addTestClass(testClass, 'TestClass');
      const references = symbolManager.getAllReferencesInFile(testClassUri);

      // Should have chained type references for System.Url (variable type and method call)
      const chainedTypeRefs = references.filter(
        (ref) => ref.context === ReferenceContext.CHAINED_TYPE,
      );
      expect(chainedTypeRefs.length).toBeGreaterThanOrEqual(1);

      // Should have at least one System.Url reference
      const systemUrlRefs = chainedTypeRefs.filter(
        (ref) => ref.name === 'System.Url',
      );
      expect(systemUrlRefs.length).toBeGreaterThanOrEqual(1);
    });
  });
});
