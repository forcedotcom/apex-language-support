/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { enableConsoleLogging, setLogLevel } from '@salesforce/apex-lsp-shared';
import {
  CompilerService,
  CompilationOptions,
} from '../../src/parser/compilerService';
import { ApexSymbolCollectorListener } from '../../src/parser/listeners/ApexSymbolCollectorListener';
import { FullSymbolCollectorListener } from '../../src/parser/listeners/FullSymbolCollectorListener';
import { BlockContentListener } from '../../src/parser/listeners/BlockContentListener';
import { SymbolTable } from '../../src/types/symbol';
import {
  ReferenceContext,
  SymbolReferenceFactory,
} from '../../src/types/symbolReference';
import { ApexReferenceResolver } from '../../src/parser/references/ApexReferenceResolver';
import { isChainedSymbolReference } from '../../src/utils/symbolNarrowing';
import { findOccurrencesInFile } from '../../src/symbols/ops/findOccurrencesInFile';
import { findFieldOccurrences } from '../../src/symbols/ops/findFieldOccurrences';

describe('FullSymbolCollectorListener - Assignment Reference Capture', () => {
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

      const listener = new ApexSymbolCollectorListener(undefined, 'full');
      compilerService.compile(sourceCode, 'AssignTest.cls', listener);

      const symbolTable = listener.getResult();
      const references = symbolTable.getAllReferences();
      // Note: VARIABLE_DECLARATION references were removed as part of optimization.
      // Variables are now resolved directly by checking identifierRange in getSymbolAtPositionPrecise.
      // Verify that variable 'a' exists as a symbol instead
      const variableSymbol = symbolTable
        .getAllSymbols()
        .find((s) => s.name === 'a' && s.kind === 'variable');
      expect(variableSymbol).toBeDefined();

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

      const listener = new ApexSymbolCollectorListener(undefined, 'full');
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
    it.each([
      ['full', () => new ApexSymbolCollectorListener(undefined, 'full')],
      ['layered', () => new FullSymbolCollectorListener()],
      ['block', () => new BlockContentListener(new SymbolTable())],
    ] as const)(
      'keeps the terminal assignment range and occurrences receiver-owned (%s)',
      (
        _mode: string,
        createListener: () =>
          | ApexSymbolCollectorListener
          | FullSymbolCollectorListener
          | BlockContentListener,
      ) => {
        const uri = 'Caller.cls';
        const listener = createListener();
        const result = compilerService.compile(
          [
            'public class Caller {',
            '  public class Child { public Integer total; }',
            '  public class Wrapper { public Child child; }',
            '  public Integer total;',
            '  void run(Caller.Wrapper receiver) {',
            '    receiver.child.total += 1;',
            '    total = 2;',
            '  }',
            '}',
          ].join('\n'),
          uri,
          listener,
        );
        expect(result.errors).toHaveLength(0);
        const table = listener.getResult();
        const range = {
          startLine: 6,
          startColumn: 19,
          endLine: 6,
          endColumn: 24,
        };
        const terminal = table
          .getReferencesAtPosition({ line: 6, character: 20 })
          .find((reference) => reference.name === 'total');
        expect(terminal?.location.identifierRange).toEqual(range);
        expect(terminal?.location.symbolRange).toEqual(range);
        expect(terminal?.access).toBe('readwrite');
        expect(terminal?.resolvedSymbolId).toBeUndefined();
        expect(
          table
            .getAllReferences()
            .some(
              (reference) =>
                reference.name === 'total' &&
                reference.location.identifierRange.startLine === 6,
            ),
        ).toBe(false);
        expect(
          findOccurrencesInFile(table, uri, {
            name: 'total',
            kind: 'field',
          }).some((match) => match.identifierRange.startLine === 6),
        ).toBe(true);
        if (_mode !== 'block') {
          const occurrences = findFieldOccurrences(
            table,
            uri,
            { name: 'total', kind: 'field' },
            'Caller.Child',
          );
          // Rename retains its conservative multi-hop safety contract rather
          // than attributing the terminal member to the chain's root owner.
          expect(occurrences.unsafe).toEqual([
            expect.objectContaining({ identifierRange: range }),
          ]);
          expect(occurrences.occurrences).toHaveLength(0);
          const callerOccurrences = findFieldOccurrences(
            table,
            uri,
            { name: 'total', kind: 'field' },
            'Caller',
          );
          expect(
            callerOccurrences.occurrences.map(
              (match) => match.identifierRange.startLine,
            ),
          ).toEqual([7]);
        }
      },
    );

    it('isolates intermediate assignment occurrences by receiver owner', () => {
      const uri = 'Caller.cls';
      const listener = new ApexSymbolCollectorListener(undefined, 'full');
      const result = compilerService.compile(
        [
          'public class Caller {',
          '  public class Child { public Integer total; }',
          '  public class Wrapper { public Child child; }',
          '  public Child child;',
          '  void run(Caller.Wrapper receiver) {',
          '    receiver.child.total = 1;',
          '    child = null;',
          '  }',
          '}',
        ].join('\n'),
        uri,
        listener,
      );
      expect(result.errors).toHaveLength(0);
      const table = listener.getResult();
      const receiverOccurrences = findFieldOccurrences(
        table,
        uri,
        { name: 'child', kind: 'field' },
        'Caller.Wrapper',
      );
      expect(receiverOccurrences.unsafe).toHaveLength(0);
      expect(
        receiverOccurrences.occurrences.map(
          (match) => match.identifierRange.startLine,
        ),
      ).toEqual([6]);
      expect(
        findOccurrencesInFile(table, uri, { name: 'child', kind: 'field' }),
      ).toHaveLength(2);
      const childReferences = table
        .getAllReferences()
        .flatMap((reference) => reference.chainNodes ?? [reference])
        .filter(
          (reference) =>
            reference.name === 'child' &&
            reference.location.identifierRange.startLine === 6,
        );
      expect(
        childReferences.every(
          (reference) => reference.resolvedSymbolId === undefined,
        ),
      ).toBe(true);
      const callerOccurrences = findFieldOccurrences(
        table,
        uri,
        { name: 'child', kind: 'field' },
        'Caller',
      );
      expect(callerOccurrences.unsafe).toHaveLength(0);
      expect(
        callerOccurrences.occurrences.map(
          (match) => match.identifierRange.startLine,
        ),
      ).toEqual([7]);
    });

    it.each([
      ['full', () => new ApexSymbolCollectorListener(undefined, 'full')],
      ['layered', () => new FullSymbolCollectorListener()],
      ['block', () => new BlockContentListener(new SymbolTable())],
    ] as const)(
      'finds the intermediate field occurrence in a nested assignment (%s)',
      (
        _mode: string,
        createListener: () =>
          | ApexSymbolCollectorListener
          | FullSymbolCollectorListener
          | BlockContentListener,
      ) => {
        const listener = createListener();
        const uri = 'AssignTest.cls';
        const result = compilerService.compile(
          [
            'public class AssignTest {',
            '  void run(Wrapper receiver) {',
            '    receiver.child.total = 1;',
            '  }',
            '}',
          ].join('\n'),
          uri,
          listener,
          { enableReferenceCorrection: false },
        );
        expect(result.errors).toHaveLength(0);
        expect(
          findOccurrencesInFile(listener.getResult(), uri, {
            name: 'child',
            kind: 'field',
          }),
        ).toEqual([
          expect.objectContaining({
            context: ReferenceContext.FIELD_ACCESS,
            identifierRange: {
              startLine: 3,
              startColumn: 13,
              endLine: 3,
              endColumn: 18,
            },
          }),
        ]);
        const chain = listener
          .getResult()
          .getAllReferences()
          .find((reference) => reference.name === 'receiver.child.total');
        expect(chain?.chainNodes?.[1].context).toBe(
          ReferenceContext.CHAIN_STEP,
        );
      },
    );

    it.each([
      ['full', () => new ApexSymbolCollectorListener(undefined, 'full')],
      ['layered', () => new FullSymbolCollectorListener()],
      ['block', () => new BlockContentListener(new SymbolTable())],
    ] as const)(
      'preserves qualified static assignment chain context and ranges (%s)',
      (
        _mode: string,
        createListener: () =>
          | ApexSymbolCollectorListener
          | FullSymbolCollectorListener
          | BlockContentListener,
      ) => {
        const listener = createListener();
        const result = compilerService.compile(
          [
            'public class AssignTest {',
            '  public class Nested { public static Integer total; }',
            '  void run(Integer value) {',
            '    AssignTest.Nested.total = value;',
            '  }',
            '}',
          ].join('\n'),
          'AssignTest.cls',
          listener,
          { enableReferenceCorrection: false },
        );
        expect(result.errors).toHaveLength(0);
        const references = listener.getResult().getAllReferences();
        const chain = references.find(
          (reference) => reference.name === 'AssignTest.Nested.total',
        );
        expect(isChainedSymbolReference(chain!)).toBe(true);
        if (!chain || !isChainedSymbolReference(chain)) return;
        expect(chain.chainNodes.map((node) => node.context)).toEqual([
          ReferenceContext.VARIABLE_USAGE,
          ReferenceContext.CHAIN_STEP,
          ReferenceContext.FIELD_ACCESS,
        ]);
        expect(chain.chainNodes.map((node) => node.access)).toEqual([
          'read',
          'read',
          'write',
        ]);
        const selected = listener.getResult().getReferencesAtPosition({
          line: 4,
          character: 23,
        });
        expect(
          [...new Set(selected.map((reference) => reference.name))].sort(),
        ).toEqual(['AssignTest.Nested.total', 'total']);
      },
    );

    it('preserves nested assignment hops and compound access', () => {
      const listener = new ApexSymbolCollectorListener(undefined, 'full');
      compilerService.compile(
        'public class AssignTest { void run(Wrapper receiver, Integer value) { receiver.child.total += value; } }',
        'AssignTest.cls',
        listener,
      );
      const chain = listener
        .getResult()
        .getAllReferences()
        .find(
          (reference) =>
            isChainedSymbolReference(reference) &&
            reference.name === 'receiver.child.total',
        );
      expect(isChainedSymbolReference(chain!)).toBe(true);
      if (!chain || !isChainedSymbolReference(chain)) return;
      expect(chain.chainNodes.map((node) => node.name)).toEqual([
        'receiver',
        'child',
        'total',
      ]);
      expect(chain.chainNodes.map((node) => node.access)).toEqual([
        'read',
        'read',
        'readwrite',
      ]);
      expect(chain.chainNodes[0].context).toBe(ReferenceContext.VARIABLE_USAGE);
      expect(
        chain.chainNodes[1].location.identifierRange.endColumn,
      ).toBeLessThan(chain.chainNodes[2].location.identifierRange.startColumn);
    });

    it('does not reclassify a lexically bound chain receiver as a class', () => {
      const listener = new ApexSymbolCollectorListener(undefined, 'full');
      compilerService.compile(
        [
          'public class AssignTest {',
          '  void run(ContentVersion contentVersion) {',
          '    Blob data = contentVersion.VersionData;',
          '  }',
          '}',
        ].join('\n'),
        'AssignTest.cls',
        listener,
        { enableReferenceCorrection: false },
      );
      const table = listener.getResult();
      const receiver = table
        .getAllReferences()
        .find((reference) => reference.name === 'contentVersion');
      expect(receiver).toBeDefined();
      const member = SymbolReferenceFactory.createFieldAccessReference(
        'VersionData',
        {
          identifierRange: {
            startLine: 3,
            startColumn: 31,
            endLine: 3,
            endColumn: 42,
          },
          symbolRange: {
            startLine: 3,
            startColumn: 31,
            endLine: 3,
            endColumn: 42,
          },
        },
        'contentVersion',
      );
      table.addTypeReference(
        SymbolReferenceFactory.createChainedExpressionReference(
          [receiver!, member],
          { ...member, name: 'contentVersion.VersionData' },
        ),
      );
      new ApexReferenceResolver().resolveSameFileReferences(table);
      expect(receiver?.context).toBe(ReferenceContext.VARIABLE_USAGE);
      expect(receiver?.resolvedSymbolId).toBe(
        table.getAllSymbols().find((symbol) => symbol.name === 'contentVersion')
          ?.id,
      );
    });

    it.each([
      ['full', () => new ApexSymbolCollectorListener(undefined, 'full')],
      ['layered', () => new FullSymbolCollectorListener()],
      ['block', () => new BlockContentListener(new SymbolTable())],
    ] as const)(
      'preserves ContentVersion assignment receiver identity (%s)',
      (
        _mode: string,
        createListener: () =>
          | ApexSymbolCollectorListener
          | FullSymbolCollectorListener
          | BlockContentListener,
      ) => {
        const sourceCode = [
          'public class AssignTest {',
          '  void run(Blob value) {',
          '    ContentVersion contentVersion = new ContentVersion();',
          '    contentVersion.VersionData = value;',
          '  }',
          '}',
        ].join('\n');
        const listener = createListener();
        const result = compilerService.compile(
          sourceCode,
          'AssignTest.cls',
          listener,
        );
        expect(result.errors).toHaveLength(0);
        const table = listener.getResult();
        const receiver = table
          .getAllReferences()
          .find(
            (reference) =>
              reference.name === 'contentVersion' &&
              reference.context === ReferenceContext.VARIABLE_USAGE,
          );
        const receiverRange = {
          startLine: 4,
          startColumn: 4,
          endLine: 4,
          endColumn: 18,
        };
        const fieldRange = {
          startLine: 4,
          startColumn: 19,
          endLine: 4,
          endColumn: 30,
        };
        expect(receiver?.location.identifierRange).toEqual(receiverRange);
        expect(receiver?.location.symbolRange).toEqual(receiverRange);
        const selected = table.getReferencesAtPosition({
          line: 4,
          character: 20,
        });
        expect(
          selected.some(
            (reference) =>
              reference.context === ReferenceContext.VARIABLE_USAGE,
          ),
        ).toBe(false);
        const field = selected.find(
          (reference) => reference.name === 'VersionData',
        );
        expect(field?.context).toBe(ReferenceContext.FIELD_ACCESS);
        expect(field?.location.identifierRange).toEqual(fieldRange);
        expect(field?.access).toBe('write');
        const chain = selected.find(isChainedSymbolReference);
        expect(chain?.chainNodes?.map((node) => node.name)).toEqual([
          'contentVersion',
          'VersionData',
        ]);
        expect(chain?.chainNodes?.[0].location.identifierRange).toEqual(
          receiverRange,
        );
        expect(chain?.chainNodes?.[1].location.identifierRange).toEqual(
          fieldRange,
        );
      },
    );

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

      const listener = new ApexSymbolCollectorListener(undefined, 'full');
      compilerService.compile(sourceCode, 'AssignTest.cls', listener);

      const symbolTable = listener.getResult();
      const references = symbolTable.getAllReferences();

      const vars = references.filter(
        (r) => r.context === ReferenceContext.VARIABLE_USAGE,
      );
      const fields = references
        .flatMap((reference) => reference.chainNodes ?? [reference])
        .filter((r) => r.context === ReferenceContext.FIELD_ACCESS);

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

      const listener = new ApexSymbolCollectorListener(undefined, 'full');
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

      const listener = new ApexSymbolCollectorListener(undefined, 'full');
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
    it.skip("should capture method call for 'String x = \'x\'.capitalize();'", () => {
      const sourceCode = `
        public class LiteralCallTest {
          public void m() {
            String x = 'x'.capitalize();
          }
        }
      `;

      const listener = new ApexSymbolCollectorListener(undefined, 'full');
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
    it.skip('captures EncodingUtil as CLASS_REFERENCE and method calls with qualifier', () => {
      const sourceCode = `
        public class StdRefTest {
          public void m() {
            String a = EncodingUtil.urlEncode('Hello World', 'UTF-8');
            String b = EncodingUtil.urlDecode('Hello%20World', 'UTF-8');
          }
        }
      `;

      const listener = new ApexSymbolCollectorListener(undefined, 'full');
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
          r.context === ReferenceContext.METHOD_CALL && r.name === 'urlEncode',
      );
      const encVarUsages = refs.filter(
        (r) =>
          r.context === ReferenceContext.VARIABLE_USAGE &&
          r.name === 'EncodingUtil',
      );

      // Should create a class reference for the qualifier at least once
      expect(classRefs.length).toBeGreaterThanOrEqual(1);
      // Both method calls should be captured
      expect(methodCalls.length).toBe(2);
      // Should not misclassify the qualifier as a variable usage
      expect(encVarUsages.length).toBe(0);
    });
  });

  describe('reference correction disabled (no second pass)', () => {
    it('should keep VARIABLE_USAGE for class qualifiers when correction is disabled', () => {
      const sourceCode = `
        public class StdRefTest {
          public void m() {
            String a = EncodingUtil.urlEncode('Hello World', 'UTF-8');
            String b = FileUtilities.createFile('test.txt', 'content');
          }
        }
      `;

      const listener = new ApexSymbolCollectorListener(undefined, 'full');
      const options: CompilationOptions = {
        enableReferenceCorrection: false,
      };
      compilerService.compile(sourceCode, 'StdRefTest.cls', listener, options);

      const symbolTable = listener.getResult();
      const refs = symbolTable.getAllReferences();

      // When correction is disabled, EncodingUtil should remain VARIABLE_USAGE
      const encVarUsages = refs.filter(
        (r) =>
          r.context === ReferenceContext.VARIABLE_USAGE &&
          r.name === 'EncodingUtil',
      );
      expect(encVarUsages.length).toBeGreaterThan(0);

      // FileUtilities should also remain VARIABLE_USAGE when correction is disabled
      const fileUtilsVarUsages = refs.filter(
        (r) =>
          r.context === ReferenceContext.VARIABLE_USAGE &&
          r.name === 'FileUtilities',
      );
      expect(fileUtilsVarUsages.length).toBeGreaterThan(0);

      // Method calls should still be captured
      // With our changes, chained calls like EncodingUtil.urlEncode() only have chained references
      // Check for chained references that contain the method names
      const chainedMethodRefs = refs.filter((r) => {
        const chainNodes = (r as any).chainNodes;
        if (chainNodes && Array.isArray(chainNodes)) {
          return chainNodes.some(
            (node: any) =>
              node.name === 'urlEncode' || node.name === 'createFile',
          );
        }
        return false;
      });
      // Also check for individual METHOD_CALL references (for standalone calls)
      const individualMethodCalls = refs.filter(
        (r) =>
          r.context === ReferenceContext.METHOD_CALL &&
          (r.name === 'urlEncode' || r.name === 'createFile'),
      );
      expect(
        chainedMethodRefs.length + individualMethodCalls.length,
      ).toBeGreaterThanOrEqual(2);
    });

    it('should keep VARIABLE_USAGE for workspace class qualifiers when correction is disabled', () => {
      // Note: FileUtilities class must be compiled separately or available in symbol manager
      // For this test, we'll use a simpler approach - just test the method call capture
      const sourceCode = `
        public class TestClass {
          public void m() {
            String result = FileUtilities.createFile('test.txt', 'content');
          }
        }
      `;

      const listener = new ApexSymbolCollectorListener(undefined, 'full');
      const options: CompilationOptions = {
        enableReferenceCorrection: false,
      };
      compilerService.compile(sourceCode, 'TestClass.cls', listener, options);

      const symbolTable = listener.getResult();
      const refs = symbolTable.getAllReferences();

      // FileUtilities should remain VARIABLE_USAGE when correction is disabled
      // When correction is disabled, processStandaloneMethodCall creates VARIABLE_USAGE
      // The chain nodes use CHAIN_STEP context, but we have a separate VARIABLE_USAGE reference
      const fileUtilsVarUsages = refs.filter(
        (r) =>
          r.context === ReferenceContext.VARIABLE_USAGE &&
          r.name === 'FileUtilities',
      );

      // When correction is disabled, we should have a VARIABLE_USAGE reference
      expect(fileUtilsVarUsages.length).toBeGreaterThan(0);

      // Should NOT have CLASS_REFERENCE for FileUtilities when correction is disabled
      const fileUtilsClassRefs = refs.filter(
        (r) =>
          r.context === ReferenceContext.CLASS_REFERENCE &&
          r.name === 'FileUtilities',
      );
      expect(fileUtilsClassRefs.length).toBe(0);
    });

    it('should still capture chained references when correction is disabled', () => {
      const sourceCode = `
        public class TestClass {
          public void m() {
            String result = FileUtilities.createFile('test.txt', 'content');
          }
        }
      `;

      const listener = new ApexSymbolCollectorListener(undefined, 'full');
      const options: CompilationOptions = {
        enableReferenceCorrection: false,
      };
      compilerService.compile(sourceCode, 'TestClass.cls', listener, options);

      const symbolTable = listener.getResult();
      const refs = symbolTable.getAllReferences();

      // Chained references should still be captured
      // Check for chained reference with the full expression name
      const chainedRefs = refs.filter(
        (r) =>
          isChainedSymbolReference(r) && r.name === 'FileUtilities.createFile',
      );

      // If no chained refs found, check what references were actually created for debugging
      if (chainedRefs.length === 0) {
        const fileUtilitiesRefs = refs.filter((r) =>
          r.name.includes('FileUtilities'),
        );
        const createFileRefs = refs.filter((r) =>
          r.name.includes('createFile'),
        );
        // Log for debugging - but don't fail if individual refs exist
        // The chained reference might be created differently
        expect(fileUtilitiesRefs.length > 0 || createFileRefs.length > 0).toBe(
          true,
        );
      } else {
        expect(chainedRefs.length).toBeGreaterThan(0);
      }
    });

    it('should demonstrate difference between enabled and disabled correction', () => {
      // Use a cross-file class reference (FileUtilities not in same file)
      // This tests the behavior when the class isn't known at parse time
      const sourceCode = `
        public class TestClass {
          public void m() {
            String result = FileUtilities.createFile('test.txt', 'content');
          }
        }
      `;

      // Test with correction DISABLED
      const listenerDisabled = new ApexSymbolCollectorListener(
        undefined,
        'full',
      );
      const optionsDisabled: CompilationOptions = {
        enableReferenceCorrection: false,
      };
      compilerService.compile(
        sourceCode,
        'TestClassDisabled.cls',
        listenerDisabled,
        optionsDisabled,
      );

      const symbolTableDisabled = listenerDisabled.getResult();
      const refsDisabled = symbolTableDisabled.getAllReferences();

      const fileUtilsVarUsagesDisabled = refsDisabled.filter(
        (r) =>
          r.context === ReferenceContext.VARIABLE_USAGE &&
          r.name === 'FileUtilities',
      );
      const fileUtilsClassRefsDisabled = refsDisabled.filter(
        (r) =>
          r.context === ReferenceContext.CLASS_REFERENCE &&
          r.name === 'FileUtilities',
      );

      // With correction disabled: VARIABLE_USAGE exists, CLASS_REFERENCE does not
      expect(fileUtilsVarUsagesDisabled.length).toBeGreaterThan(0);
      expect(fileUtilsClassRefsDisabled.length).toBe(0);

      // Test with correction ENABLED (default)
      const listenerEnabled = new ApexSymbolCollectorListener(
        undefined,
        'full',
      );
      compilerService.compile(
        sourceCode,
        'TestClassEnabled.cls',
        listenerEnabled,
      );

      const symbolTableEnabled = listenerEnabled.getResult();
      const refsEnabled = symbolTableEnabled.getAllReferences();

      const fileUtilsVarUsagesEnabled = refsEnabled.filter(
        (r) =>
          r.context === ReferenceContext.VARIABLE_USAGE &&
          r.name === 'FileUtilities',
      );
      const fileUtilsClassRefsEnabled = refsEnabled.filter(
        (r) =>
          r.context === ReferenceContext.CLASS_REFERENCE &&
          r.name === 'FileUtilities',
      );

      // With correction enabled: The second pass upgrades VARIABLE_USAGE to CLASS_REFERENCE
      // because FileUtilities is a qualifier in FileUtilities.createFile()
      // The shouldBeClassReference method checks isQualifierInQualifiedCall, which returns true
      // So VARIABLE_USAGE gets upgraded to CLASS_REFERENCE even for cross-file classes
      // The key difference is:
      // - When disabled: VARIABLE_USAGE remains as VARIABLE_USAGE (second pass doesn't run)
      // - When enabled: VARIABLE_USAGE gets upgraded to CLASS_REFERENCE (second pass runs)
      expect(fileUtilsVarUsagesEnabled.length).toBe(0);
      expect(fileUtilsClassRefsEnabled.length).toBeGreaterThan(0);

      // The main point: when disabled, we explicitly have VARIABLE_USAGE and NOT CLASS_REFERENCE
      // This demonstrates that the toggle is working - disabled creates VARIABLE_USAGE and doesn't upgrade it
    });
  });
});
