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
import { isChainedSymbolReference } from '../../src/utils/symbolNarrowing';
import type { ChainedSymbolReference } from '../../src/types/symbolReference';
import { Effect } from 'effect';

describe('ApexSymbolManager - Precise Location Tracking', () => {
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

  describe('Dotted Type Name Location Tracking', () => {
    it('should track precise locations for each part of System.Url', async () => {
      const testClass = `
        public class TestClass {
          public System.Url getUrl() {
            return null;
          }
        }
      `;

      const testClassUri = await addTestClass(testClass, 'TestClass');
      const references = symbolManager.getAllReferencesInFile(testClassUri);

      // Find the chained type reference for System.Url
      const chainedTypeRefs = references.filter(
        (ref) => isChainedSymbolReference(ref) && ref.name === 'System.Url',
      );
      expect(chainedTypeRefs).toHaveLength(1);

      const chainedRef = chainedTypeRefs[0] as ChainedSymbolReference;
      expect(chainedRef.chainNodes).toHaveLength(2);

      // Check that each chain node has its own location
      const systemNode = chainedRef.chainNodes[0];
      const urlNode = chainedRef.chainNodes[1];

      expect(systemNode.name).toBe('System');
      expect(urlNode.name).toBe('Url');

      // Verify that the locations are different (System and Url should be at different positions)
      expect(systemNode.location.identifierRange.startColumn).not.toBe(
        urlNode.location.identifierRange.startColumn,
      );
    });

    it('should track precise locations for parameter types', async () => {
      const testClass = `
        public class TestClass {
          public void processUrl(System.Url inputUrl) {
            // Method body
          }
        }
      `;

      const testClassUri = await addTestClass(testClass, 'TestClass');
      const references = symbolManager.getAllReferencesInFile(testClassUri);

      // Find the chained type reference for System.Url parameter
      const chainedTypeRefs = references.filter(
        (ref) => isChainedSymbolReference(ref) && ref.name === 'System.Url',
      );
      expect(chainedTypeRefs).toHaveLength(1);

      const chainedRef = chainedTypeRefs[0] as ChainedSymbolReference;
      expect(chainedRef.chainNodes).toHaveLength(2);

      // Check that each chain node has its own location
      const systemNode = chainedRef.chainNodes[0];
      const urlNode = chainedRef.chainNodes[1];

      expect(systemNode.name).toBe('System');
      expect(urlNode.name).toBe('Url');

      // Verify that the locations are different
      expect(systemNode.location.identifierRange.startColumn).not.toBe(
        urlNode.location.identifierRange.startColumn,
      );
    });

    it('should track precise locations for field types', async () => {
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
      expect(chainedTypeRefs).toHaveLength(1);

      const chainedRef = chainedTypeRefs[0] as ChainedSymbolReference;
      expect(chainedRef.chainNodes).toHaveLength(2);

      // Check that each chain node has its own location
      const systemNode = chainedRef.chainNodes[0];
      const urlNode = chainedRef.chainNodes[1];

      expect(systemNode.name).toBe('System');
      expect(urlNode.name).toBe('Url');

      // Verify that the locations are different
      expect(systemNode.location.identifierRange.startColumn).not.toBe(
        urlNode.location.identifierRange.startColumn,
      );
    });

    it('should track precise locations for complex dotted types', async () => {
      const testClass = `
        public class TestClass {
          public System.Url getUrl() {
            return System.Url.getOrgDomainUrl();
          }
        }
      `;

      const testClassUri = await addTestClass(testClass, 'TestClass');
      const references = symbolManager.getAllReferencesInFile(testClassUri);

      // Find all chained type references for System.Url (return type and method call)
      const chainedTypeRefs = references.filter(
        (ref) => isChainedSymbolReference(ref) && ref.name === 'System.Url',
      );
      expect(chainedTypeRefs.length).toBeGreaterThanOrEqual(1);

      // Check the first chained reference (should be the return type)
      const chainedRef = chainedTypeRefs[0] as ChainedSymbolReference;
      expect(chainedRef.chainNodes).toHaveLength(2);

      // Check that each chain node has its own location
      const systemNode = chainedRef.chainNodes[0];
      const urlNode = chainedRef.chainNodes[1];

      expect(systemNode.name).toBe('System');
      expect(urlNode.name).toBe('Url');

      // Verify that the locations are different
      expect(systemNode.location.identifierRange.startColumn).not.toBe(
        urlNode.location.identifierRange.startColumn,
      );

      // Verify that the locations are in the correct order (System before Url)
      expect(systemNode.location.identifierRange.startColumn).toBeLessThan(
        urlNode.location.identifierRange.startColumn,
      );
    });
  });
});
