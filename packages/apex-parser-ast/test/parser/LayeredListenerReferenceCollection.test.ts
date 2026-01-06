/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { CompilerService } from '../../src/parser/compilerService';
import { VisibilitySymbolListener } from '../../src/parser/listeners/VisibilitySymbolListener';
import { FullSymbolCollectorListener } from '../../src/parser/listeners/FullSymbolCollectorListener';
import { SymbolTable } from '../../src/types/symbol';
import { ReferenceContext } from '../../src/types/symbolReference';

describe('Layered Listener Reference Collection', () => {
  let compilerService: CompilerService;

  beforeEach(() => {
    compilerService = new CompilerService();
  });

  describe('visibility-based reference collection', () => {
    it('should only collect declaration references in public methods for PublicAPISymbolListener', () => {
      const sourceCode = `
        public class VisibilityTest {
          public Integer publicMethod(Integer param) {
            Integer a = 1;
            return a;
          }
          protected Integer protectedMethod(Integer param) {
            Integer c = 3;
            return c;
          }
          private Integer privateMethod(Integer param) {
            Integer e = 5;
            return e;
          }
        }
      `;

      const symbolTable = new SymbolTable();
      const listener = new VisibilitySymbolListener('public-api', symbolTable);
      compilerService.compile(sourceCode, 'VisibilityTest.cls', listener);

      const references = symbolTable.getAllReferences();
      // Declaration references: return type, parameter types, local variable types
      const declarationRefs = references.filter(
        (r) =>
          r.context === ReferenceContext.TYPE_DECLARATION ||
          r.context === ReferenceContext.RETURN_TYPE ||
          r.context === ReferenceContext.PARAMETER_TYPE,
      );

      // Should only have declaration references from publicMethod
      // (return type Integer, parameter type Integer, local variable type Integer)
      const publicMethodRefs = declarationRefs.filter(
        (r) => r.parentContext === 'publicMethod',
      );
      const protectedMethodRefs = declarationRefs.filter(
        (r) => r.parentContext === 'protectedMethod',
      );
      const privateMethodRefs = declarationRefs.filter(
        (r) => r.parentContext === 'privateMethod',
      );

      // Public method declaration references should be captured
      expect(publicMethodRefs.length).toBeGreaterThan(0);

      // Protected/private method declaration references should NOT be captured
      expect(protectedMethodRefs.length).toBe(0);
      expect(privateMethodRefs.length).toBe(0);
    });

    it('should only collect declaration references in protected/default methods for ProtectedSymbolListener', () => {
      const sourceCode = `
        public class VisibilityTest {
          public Integer publicMethod(Integer param) {
            Integer a = 1;
            return a;
          }
          protected Integer protectedMethod(Integer param) {
            Integer c = 3;
            return c;
          }
          Integer defaultMethod(Integer param) {
            Integer g = 7;
            return g;
          }
        }
      `;

      const symbolTable = new SymbolTable();
      const listener = new VisibilitySymbolListener('protected', symbolTable);
      compilerService.compile(sourceCode, 'VisibilityTest.cls', listener);

      const references = symbolTable.getAllReferences();
      // Declaration references: return type, parameter types, local variable types
      const declarationRefs = references.filter(
        (r) =>
          r.context === ReferenceContext.TYPE_DECLARATION ||
          r.context === ReferenceContext.RETURN_TYPE ||
          r.context === ReferenceContext.PARAMETER_TYPE,
      );

      // Should only have declaration references from protectedMethod and defaultMethod
      const publicMethodRefs = declarationRefs.filter(
        (r) => r.parentContext === 'publicMethod',
      );
      const protectedMethodRefs = declarationRefs.filter(
        (r) => r.parentContext === 'protectedMethod',
      );
      const defaultMethodRefs = declarationRefs.filter(
        (r) => r.parentContext === 'defaultMethod',
      );

      // Protected/default method declaration references should be captured
      expect(protectedMethodRefs.length).toBeGreaterThan(0);
      expect(defaultMethodRefs.length).toBeGreaterThan(0);

      // Public method declaration references should NOT be captured
      expect(publicMethodRefs.length).toBe(0);
    });

    it('should only collect declaration references in private methods for PrivateSymbolListener', () => {
      const sourceCode = `
        public class VisibilityTest {
          public Integer publicMethod(Integer param) {
            Integer a = 1;
            return a;
          }
          private Integer privateMethod(Integer param) {
            Integer e = 5;
            return e;
          }
        }
      `;

      const symbolTable = new SymbolTable();
      const listener = new VisibilitySymbolListener('private', symbolTable);
      compilerService.compile(sourceCode, 'VisibilityTest.cls', listener);

      const references = symbolTable.getAllReferences();
      // Declaration references: return type, parameter types, local variable types
      const declarationRefs = references.filter(
        (r) =>
          r.context === ReferenceContext.TYPE_DECLARATION ||
          r.context === ReferenceContext.RETURN_TYPE ||
          r.context === ReferenceContext.PARAMETER_TYPE,
      );

      // Should only have declaration references from privateMethod
      const publicMethodRefs = declarationRefs.filter(
        (r) => r.parentContext === 'publicMethod',
      );
      const privateMethodRefs = declarationRefs.filter(
        (r) => r.parentContext === 'privateMethod',
      );

      // Private method declaration references should be captured
      expect(privateMethodRefs.length).toBeGreaterThan(0);

      // Public method declaration references should NOT be captured
      expect(publicMethodRefs.length).toBe(0);
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
