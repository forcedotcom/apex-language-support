/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { CompilerService } from '../../src/parser/compilerService';
import { ApexSymbolCollectorListener } from '../../src/parser/listeners/ApexSymbolCollectorListener';
import { ReferenceContext } from '../../src/types/symbolReference';

describe('ApexReferenceCollectorListener Performance Features', () => {
  let compilerService: CompilerService;

  beforeEach(() => {
    compilerService = new CompilerService();
  });

  describe('AST Context Caching', () => {
    it('should correctly collect references using cached context', () => {
      // Large file with many references to exercise the cache
      const sourceCode = `
        public class CacheTest {
          public void m1() {
            Integer a = 1;
            Integer b = 2;
            Integer c = a + b;
            System.debug(c);
          }
          public void m2() {
            String s = 'test';
            System.debug(s);
          }
        }
      `;

      // Use FullSymbolCollectorListener to get symbols AND references
      const listener = new ApexSymbolCollectorListener(undefined, 'full');
      compilerService.compile(sourceCode, 'CacheTest.cls', listener);
      const symbolTable = listener.getResult();

      const references = symbolTable.getAllReferences();

      // Verify basic reference properties are still correct
      const aRefs = references.filter(
        (r) => r.name === 'a' && r.context === ReferenceContext.VARIABLE_USAGE,
      );
      expect(aRefs.length).toBeGreaterThan(0);
      expect(aRefs[0].parentContext).toBe('m1');

      const sRefs = references.filter(
        (r) => r.name === 's' && r.context === ReferenceContext.VARIABLE_USAGE,
      );
      expect(sRefs.length).toBeGreaterThan(0);
      expect(sRefs[0].parentContext).toBe('m2');

      const debugRefs = references.filter((r) => r.name === 'debug');
      expect(debugRefs.length).toBe(2);
      expect(debugRefs.some((r) => r.parentContext === 'm1')).toBe(true);
      expect(debugRefs.some((r) => r.parentContext === 'm2')).toBe(true);
    });

    it('should maintain distinct context results for different nodes', () => {
      const sourceCode = `
        public class DistinctTest {
          public Integer field1;
          public void method1() {
            Integer local1;
          }
        }
      `;

      const listener = new ApexSymbolCollectorListener(undefined, 'full');
      compilerService.compile(sourceCode, 'DistinctTest.cls', listener);
      const symbolTable = listener.getResult();

      const references = symbolTable.getAllReferences();
      const typeDecls = references.filter(
        (r) => r.context === ReferenceContext.TYPE_DECLARATION,
      );

      // Integer for field1
      const fieldRef = typeDecls.find(
        (r) => r.name === 'Integer' && r.parentContext === 'DistinctTest',
      );
      // Integer for local1
      const localRef = typeDecls.find(
        (r) => r.name === 'Integer' && r.parentContext === 'method1',
      );

      expect(fieldRef).toBeDefined();
      expect(localRef).toBeDefined();
      expect(fieldRef?.parentContext).not.toBe(localRef?.parentContext);
    });
  });
});
