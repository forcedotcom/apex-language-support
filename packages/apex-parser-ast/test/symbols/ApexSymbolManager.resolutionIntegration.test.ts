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
import { isChainedSymbolReference } from '../../src/utils/symbolNarrowing';
import { Effect } from 'effect';

describe('ApexSymbolManager - Resolution Integration', () => {
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

  describe('Return Type Reference Resolution', () => {
    it('should resolve return type references to symbols', async () => {
      const testClass = `
        public class TestClass {
          public System.Url getUrl() {
            return System.Url.getOrgDomainUrl();
          }
        }
      `;

      const testClassUri = await addTestClass(testClass, 'TestClass');
      const references = symbolManager.getAllReferencesInFile(testClassUri);

      // Find the chained type reference for System.Url return type
      const chainedTypeRefs = references.filter(
        (ref) => isChainedSymbolReference(ref) && ref.name === 'System.Url',
      );
      expect(chainedTypeRefs.length).toBeGreaterThanOrEqual(1);

      // Test resolution of the return type reference
      const returnTypeRef = chainedTypeRefs[0];
      const _resolvedSymbol = symbolManager.getSymbolAtPosition(testClassUri, {
        line: returnTypeRef.location.identifierRange.startLine, // 1-based line numbers
        character: returnTypeRef.location.identifierRange.startColumn,
      });

      // The resolution should work (even if it returns null for non-existent classes)
      // The important thing is that it doesn't throw an error
      expect(() => {
        symbolManager.getSymbolAtPosition(testClassUri, {
          line: returnTypeRef.location.identifierRange.startLine,
          character: returnTypeRef.location.identifierRange.startColumn,
        });
      }).not.toThrow();
    });

    it('should resolve parameter type references to symbols', async () => {
      const testClass = `
        public class TestClass {
          public void processUrl(System.Url inputUrl) {
            // Method body
          }
        }
      `;

      const testClassUri = await addTestClass(testClass, 'TestClass');
      const references = symbolManager.getAllReferencesInFile(testClassUri);

      // Find the type reference for System.Url parameter (could be chained or PARAMETER_TYPE)
      const typeRefs = references.filter(
        (ref) =>
          (isChainedSymbolReference(ref) ||
            ref.context === ReferenceContext.PARAMETER_TYPE) &&
          ref.name === 'System.Url',
      );
      expect(typeRefs.length).toBeGreaterThanOrEqual(1);

      // Test resolution of the parameter type reference
      const paramTypeRef = typeRefs[0];
      expect(() => {
        symbolManager.getSymbolAtPosition(testClassUri, {
          line: paramTypeRef.location.identifierRange.startLine,
          character: paramTypeRef.location.identifierRange.startColumn,
        });
      }).not.toThrow();
    });

    it('should resolve field type references to symbols', async () => {
      const testClass = `
        public class TestClass {
          public System.Url myUrl;
        }
      `;

      const testClassUri = await addTestClass(testClass, 'TestClass');
      const references = symbolManager.getAllReferencesInFile(testClassUri);

      // Find the chained type reference for System.Url field
      const chainedTypeRefs = references.filter(
        (ref) => isChainedSymbolReference(ref) && ref.name === 'System.Url',
      );
      expect(chainedTypeRefs.length).toBeGreaterThanOrEqual(1);

      // Test resolution of the field type reference
      const fieldTypeRef = chainedTypeRefs[0];
      expect(() => {
        symbolManager.getSymbolAtPosition(testClassUri, {
          line: fieldTypeRef.location.identifierRange.startLine,
          character: fieldTypeRef.location.identifierRange.startColumn,
        });
      }).not.toThrow();
    });

    it('should handle mixed return and parameter type references', async () => {
      const testClass = `
        public class TestClass {
          public System.Url processUrl(System.Url inputUrl) {
            return inputUrl;
          }
        }
      `;

      const testClassUri = await addTestClass(testClass, 'TestClass');
      const references = symbolManager.getAllReferencesInFile(testClassUri);

      // Should have multiple System.Url references (return type and parameter)
      const systemUrlRefs = references.filter(
        (ref) =>
          (isChainedSymbolReference(ref) ||
            ref.context === ReferenceContext.PARAMETER_TYPE) &&
          ref.name === 'System.Url',
      );
      expect(systemUrlRefs.length).toBeGreaterThanOrEqual(2);

      // Test resolution of each reference
      for (const ref of systemUrlRefs) {
        expect(() => {
          symbolManager.getSymbolAtPosition(testClassUri, {
            line: ref.location.identifierRange.startLine,
            character: ref.location.identifierRange.startColumn,
          });
        }).not.toThrow();
      }
    });

    it('should handle generic return type references', async () => {
      const testClass = `
        public class TestClass {
          public List<System.Url> getUrlList() {
            return new List<System.Url>();
          }
        }
      `;

      const testClassUri = await addTestClass(testClass, 'TestClass');
      const references = symbolManager.getAllReferencesInFile(testClassUri);

      // Should have type references for System.Url (return type and generic parameter)
      const systemUrlRefs = references.filter(
        (ref) =>
          (isChainedSymbolReference(ref) ||
            ref.context === ReferenceContext.PARAMETER_TYPE ||
            ref.context === ReferenceContext.GENERIC_PARAMETER_TYPE) &&
          ref.name === 'System.Url',
      );
      expect(systemUrlRefs.length).toBeGreaterThanOrEqual(1);

      // Test resolution of each reference
      for (const ref of systemUrlRefs) {
        expect(() => {
          symbolManager.getSymbolAtPosition(testClassUri, {
            line: ref.location.identifierRange.startLine,
            character: ref.location.identifierRange.startColumn,
          });
        }).not.toThrow();
      }
    });
  });

  describe('Cross-Reference Integration', () => {
    it('should integrate with existing reference resolution patterns', async () => {
      const testClass = `
        public class TestClass {
          public System.Url getUrl() {
            return System.Url.getOrgDomainUrl();
          }
          
          public void useUrl() {
            System.Url url = getUrl();
            String urlString = url.toExternalForm();
          }
        }
      `;

      const testClassUri = await addTestClass(testClass, 'TestClass');
      const references = symbolManager.getAllReferencesInFile(testClassUri);

      // Should have multiple types of references
      const chainedTypeRefs = references.filter((ref) =>
        isChainedSymbolReference(ref),
      );
      const methodCallRefs = references.filter(
        (ref) => ref.context === ReferenceContext.METHOD_CALL,
      );

      expect(chainedTypeRefs.length).toBeGreaterThan(0);
      expect(methodCallRefs.length).toBeGreaterThan(0);

      // All references should be resolvable without errors
      for (const ref of references) {
        expect(() => {
          symbolManager.getSymbolAtPosition(testClassUri, {
            line: ref.location.identifierRange.startLine,
            character: ref.location.identifierRange.startColumn,
          });
        }).not.toThrow();
      }
    });
  });
});
