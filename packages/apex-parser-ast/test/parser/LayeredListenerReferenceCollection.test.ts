/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { CompilerService } from '../../src/parser/compilerService';
import { PublicAPISymbolListener } from '../../src/parser/listeners/PublicAPISymbolListener';
import { ProtectedSymbolListener } from '../../src/parser/listeners/ProtectedSymbolListener';
import { PrivateSymbolListener } from '../../src/parser/listeners/PrivateSymbolListener';
import { FullSymbolCollectorListener } from '../../src/parser/listeners/FullSymbolCollectorListener';
import { SymbolTable } from '../../src/types/symbol';
import { ReferenceContext } from '../../src/types/symbolReference';

describe('Layered Listener Reference Collection', () => {
  let compilerService: CompilerService;

  beforeEach(() => {
    compilerService = new CompilerService();
  });

  describe('visibility-based reference collection', () => {
    it('should only collect references in public methods for PublicAPISymbolListener', () => {
      const sourceCode = `
        public class VisibilityTest {
          public void publicMethod() {
            Integer a = 1;
            Integer b = 2;
            a = b;
          }
          protected void protectedMethod() {
            Integer c = 3;
            Integer d = 4;
            c = d;
          }
          private void privateMethod() {
            Integer e = 5;
            Integer f = 6;
            e = f;
          }
        }
      `;

      const symbolTable = new SymbolTable();
      const listener = new PublicAPISymbolListener(symbolTable);
      compilerService.compile(sourceCode, 'VisibilityTest.cls', listener);

      const references = symbolTable.getAllReferences();
      const variableUsages = references.filter(
        (r) => r.context === ReferenceContext.VARIABLE_USAGE,
      );

      // Should only have references from publicMethod (a, b)
      const aRefs = variableUsages.filter((r) => r.name === 'a');
      const bRefs = variableUsages.filter((r) => r.name === 'b');
      const cRefs = variableUsages.filter((r) => r.name === 'c');
      const dRefs = variableUsages.filter((r) => r.name === 'd');
      const eRefs = variableUsages.filter((r) => r.name === 'e');
      const fRefs = variableUsages.filter((r) => r.name === 'f');

      // Public method references should be captured
      expect(aRefs.length).toBeGreaterThan(0);
      expect(bRefs.length).toBeGreaterThan(0);

      // Protected/private method references should NOT be captured
      expect(cRefs.length).toBe(0);
      expect(dRefs.length).toBe(0);
      expect(eRefs.length).toBe(0);
      expect(fRefs.length).toBe(0);
    });

    it('should only collect references in protected/default methods for ProtectedSymbolListener', () => {
      const sourceCode = `
        public class VisibilityTest {
          public void publicMethod() {
            Integer a = 1;
            Integer b = 2;
            a = b;
          }
          protected void protectedMethod() {
            Integer c = 3;
            Integer d = 4;
            c = d;
          }
          void defaultMethod() {
            Integer g = 7;
            Integer h = 8;
            g = h;
          }
        }
      `;

      const symbolTable = new SymbolTable();
      const listener = new ProtectedSymbolListener(symbolTable);
      compilerService.compile(sourceCode, 'VisibilityTest.cls', listener);

      const references = symbolTable.getAllReferences();
      const variableUsages = references.filter(
        (r) => r.context === ReferenceContext.VARIABLE_USAGE,
      );

      // Should only have references from protectedMethod and defaultMethod (c, d, g, h)
      const aRefs = variableUsages.filter((r) => r.name === 'a');
      const bRefs = variableUsages.filter((r) => r.name === 'b');
      const cRefs = variableUsages.filter((r) => r.name === 'c');
      const dRefs = variableUsages.filter((r) => r.name === 'd');
      const gRefs = variableUsages.filter((r) => r.name === 'g');
      const hRefs = variableUsages.filter((r) => r.name === 'h');

      // Protected/default method references should be captured
      expect(cRefs.length).toBeGreaterThan(0);
      expect(dRefs.length).toBeGreaterThan(0);
      expect(gRefs.length).toBeGreaterThan(0);
      expect(hRefs.length).toBeGreaterThan(0);

      // Public method references should NOT be captured
      expect(aRefs.length).toBe(0);
      expect(bRefs.length).toBe(0);
    });

    it('should only collect references in private methods for PrivateSymbolListener', () => {
      const sourceCode = `
        public class VisibilityTest {
          public void publicMethod() {
            Integer a = 1;
            Integer b = 2;
            a = b;
          }
          private void privateMethod() {
            Integer e = 5;
            Integer f = 6;
            e = f;
          }
        }
      `;

      const symbolTable = new SymbolTable();
      const listener = new PrivateSymbolListener(symbolTable);
      compilerService.compile(sourceCode, 'VisibilityTest.cls', listener);

      const references = symbolTable.getAllReferences();
      const variableUsages = references.filter(
        (r) => r.context === ReferenceContext.VARIABLE_USAGE,
      );

      // Should only have references from privateMethod (e, f)
      const aRefs = variableUsages.filter((r) => r.name === 'a');
      const bRefs = variableUsages.filter((r) => r.name === 'b');
      const eRefs = variableUsages.filter((r) => r.name === 'e');
      const fRefs = variableUsages.filter((r) => r.name === 'f');

      // Private method references should be captured
      expect(eRefs.length).toBeGreaterThan(0);
      expect(fRefs.length).toBeGreaterThan(0);

      // Public method references should NOT be captured
      expect(aRefs.length).toBe(0);
      expect(bRefs.length).toBe(0);
    });
  });

  describe('no duplicate references across listeners', () => {
    it('should not duplicate references when FullSymbolCollectorListener applies all layers', () => {
      const sourceCode = `
        public class AssignTest {
          public void m() {
            Integer a; Integer b;
            a = b;
          }
        }
      `;

      const listener = new FullSymbolCollectorListener();
      compilerService.compile(sourceCode, 'AssignTest.cls', listener);

      const symbolTable = listener.getResult();
      const references = symbolTable.getAllReferences();
      const variableUsages = references.filter(
        (r) => r.context === ReferenceContext.VARIABLE_USAGE,
      );

      const aRefs = variableUsages.filter((r) => r.name === 'a');
      const bRefs = variableUsages.filter((r) => r.name === 'b');

      // Should have exactly one reference per variable (no duplicates)
      expect(aRefs.length).toBe(1);
      expect(bRefs.length).toBe(1);
    });
  });
});

