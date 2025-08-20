/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { enableConsoleLogging, setLogLevel } from '@salesforce/apex-lsp-shared';
import { CompilerService } from '../../src/parser/compilerService';
import { ApexSymbolCollectorListener } from '../../src/parser/listeners/ApexSymbolCollectorListener';
import { ReferenceContext } from '../../src/types/typeReference';

describe('ApexSymbolCollectorListener - Assignment Reference Capture', () => {
  let compilerService: CompilerService;

  beforeEach(() => {
    compilerService = new CompilerService();
    enableConsoleLogging();
    setLogLevel('error');
  });

  describe('simple assignments', () => {
    it('should capture LHS as write and RHS as read without duplication for "a = b"', () => {
      const sourceCode = `
        public class AssignTest {
          public void m() {
            Integer a; Integer b;
            a = b;
          }
        }
      `;

      const listener = new ApexSymbolCollectorListener();
      compilerService.compile(sourceCode, 'AssignTest.cls', listener);

      const symbolTable = listener.getResult();
      const references = symbolTable.getAllReferences();
      // Also verify a declaration reference exists for variable 'a'
      const declRefs = references.filter(
        (r) =>
          (r as any).context === 7 /* VARIABLE_DECLARATION */ && r.name === 'a',
      );
      expect(declRefs.length).toBeGreaterThanOrEqual(1);

      // Filter variable usages in this method
      const vars = references.filter(
        (r) => r.context === ReferenceContext.VARIABLE_USAGE,
      );

      const aRefs = vars.filter((r) => r.name === 'a');
      const bRefs = vars.filter((r) => r.name === 'b');

      // TDD expectations (will fail until write/read semantics are implemented):
      // - exactly one write for LHS 'a'
      // - exactly one read for RHS 'b'
      expect(aRefs.length).toBe(1);
      expect((aRefs[0] as any).access).toBe('write');

      expect(bRefs.length).toBe(1);
      expect((bRefs[0] as any).access ?? 'read').toBe('read');
    });
  });

  describe('compound assignments', () => {
    it('should capture LHS as readwrite and RHS as read for "a += b"', () => {
      const sourceCode = `
        public class AssignTest {
          public void m() {
            Integer a = 0; Integer b = 1;
            a += b;
          }
        }
      `;

      const listener = new ApexSymbolCollectorListener();
      compilerService.compile(sourceCode, 'AssignTest.cls', listener);

      const symbolTable = listener.getResult();
      const references = symbolTable.getAllReferences();

      const vars = references.filter(
        (r) => r.context === ReferenceContext.VARIABLE_USAGE,
      );

      const aRefs = vars.filter((r) => r.name === 'a');
      const bRefs = vars.filter((r) => r.name === 'b');

      // One reference for LHS with readwrite access
      expect(aRefs.length).toBe(1);
      expect((aRefs[0] as any).access).toBe('readwrite');

      // One reference for RHS (read)
      expect(bRefs.length).toBe(1);
      expect((bRefs[0] as any).access ?? 'read').toBe('read');
    });
  });

  describe('field assignments', () => {
    it('should capture object read and field write for "obj.x = y"', () => {
      const sourceCode = `
        public class AssignTest {
          public class C { public Integer x; }
          public void m() {
            C obj = new C(); Integer y = 1;
            obj.x = y;
          }
        }
      `;

      const listener = new ApexSymbolCollectorListener();
      compilerService.compile(sourceCode, 'AssignTest.cls', listener);

      const symbolTable = listener.getResult();
      const references = symbolTable.getAllReferences();

      const vars = references.filter(
        (r) => r.context === ReferenceContext.VARIABLE_USAGE,
      );
      const fields = references.filter(
        (r) => r.context === ReferenceContext.FIELD_ACCESS,
      );

      const objRefs = vars.filter((r) => r.name === 'obj');
      const yRefs = vars.filter((r) => r.name === 'y');
      const xRefs = fields.filter((r) => r.name === 'x');

      // Expect exactly one object usage (read)
      expect(objRefs.length).toBe(1);
      expect((objRefs[0] as any).access ?? 'read').toBe('read');

      // Expect exactly one field access (write)
      expect(xRefs.length).toBe(1);
      expect((xRefs[0] as any).access).toBe('write');

      // Expect exactly one RHS usage (read)
      expect(yRefs.length).toBe(1);
      expect((yRefs[0] as any).access ?? 'read').toBe('read');
    });
  });

  describe('array element access', () => {
    it('should capture array and index reads for element write "arr[i] = v"', () => {
      const sourceCode = `
        public class AssignArrayWriteTest {
          public void m() {
            List<Integer> arr = new List<Integer>();
            Integer i = 0; Integer v = 42;
            arr[i] = v;
          }
        }
      `;

      const listener = new ApexSymbolCollectorListener();
      compilerService.compile(sourceCode, 'AssignArrayWriteTest.cls', listener);

      const symbolTable = listener.getResult();
      const references = symbolTable.getAllReferences();

      const vars = references.filter(
        (r) => r.context === ReferenceContext.VARIABLE_USAGE,
      );

      const arrRefs = vars.filter((r) => r.name === 'arr');
      const iRefs = vars.filter((r) => r.name === 'i');
      const vRefs = vars.filter((r) => r.name === 'v');

      // Array and index are read to compute the write target; RHS v is read
      expect(arrRefs.length).toBeGreaterThanOrEqual(1);
      expect((arrRefs[0] as any).access ?? 'read').toBe('read');

      expect(iRefs.length).toBeGreaterThanOrEqual(1);
      expect((iRefs[0] as any).access ?? 'read').toBe('read');

      expect(vRefs.length).toBeGreaterThanOrEqual(1);
      expect((vRefs[0] as any).access ?? 'read').toBe('read');
    });

    it('should capture array and index reads for element read "x = arr[i]" and LHS x as write', () => {
      const sourceCode = `
        public class AssignArrayReadTest {
          public void m() {
            List<Integer> arr = new List<Integer>();
            Integer i = 0; Integer x;
            x = arr[i];
          }
        }
      `;

      const listener = new ApexSymbolCollectorListener();
      compilerService.compile(sourceCode, 'AssignArrayReadTest.cls', listener);

      const symbolTable = listener.getResult();
      const references = symbolTable.getAllReferences();

      const vars = references.filter(
        (r) => r.context === ReferenceContext.VARIABLE_USAGE,
      );

      const arrRefs = vars.filter((r) => r.name === 'arr');
      const iRefs = vars.filter((r) => r.name === 'i');
      const xRefs = vars.filter((r) => r.name === 'x');

      // RHS arr and i reads
      expect(arrRefs.length).toBeGreaterThanOrEqual(1);
      expect((arrRefs[0] as any).access ?? 'read').toBe('read');

      expect(iRefs.length).toBeGreaterThanOrEqual(1);
      expect((iRefs[0] as any).access ?? 'read').toBe('read');

      // LHS x should be a write
      expect(xRefs.length).toBeGreaterThanOrEqual(1);
      expect((xRefs[0] as any).access).toBe('write');
    });
  });

  describe('method call on literal in initializer', () => {
    it("should capture method call for 'String x = \'x\'.capitalize();'", () => {
      const sourceCode = `
        public class LiteralCallTest {
          public void m() {
            String x = 'x'.capitalize();
          }
        }
      `;

      const listener = new ApexSymbolCollectorListener();
      compilerService.compile(sourceCode, 'LiteralCallTest.cls', listener);

      const symbolTable = listener.getResult();
      const references = symbolTable.getAllReferences();

      const methodCalls = references.filter(
        (r) =>
          r.context === ReferenceContext.METHOD_CALL && r.name === 'capitalize',
      );
      expect(methodCalls.length).toBe(1);

      const typeDecls = references.filter(
        (r) =>
          r.context === ReferenceContext.TYPE_DECLARATION &&
          r.name === 'String',
      );
      expect(typeDecls.length).toBeGreaterThanOrEqual(1);
    });
    it('captures EncodingUtil as CLASS_REFERENCE and method calls with qualifier', () => {
      const sourceCode = `
        public class StdRefTest {
          public void m() {
            String a = EncodingUtil.urlEncode('Hello World', 'UTF-8');
            String b = EncodingUtil.urlDecode('Hello%20World', 'UTF-8');
          }
        }
      `;

      const listener = new ApexSymbolCollectorListener();
      compilerService.compile(sourceCode, 'StdRefTest.cls', listener);

      const symbolTable = listener.getResult();
      const refs = symbolTable.getAllReferences();

      const classRefs = refs.filter(
        (r) =>
          r.context === ReferenceContext.CLASS_REFERENCE &&
          r.name === 'EncodingUtil',
      );
      const methodCalls = refs.filter(
        (r) =>
          r.context === ReferenceContext.METHOD_CALL &&
          (r.name === 'urlEncode' || r.name === 'urlDecode'),
      );
      const encVarUsages = refs.filter(
        (r) =>
          r.context === ReferenceContext.VARIABLE_USAGE &&
          r.name === 'EncodingUtil',
      );

      // Should create a class reference for the qualifier at least once
      expect(classRefs.length).toBeGreaterThanOrEqual(1);
      // Both method calls should be captured and associated to the qualifier
      expect(methodCalls.length).toBe(2);
      expect(methodCalls.every((r) => r.qualifier === 'EncodingUtil')).toBe(
        true,
      );
      // Should not misclassify the qualifier as a variable usage
      expect(encVarUsages.length).toBe(0);
    });
  });
});
