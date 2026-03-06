/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Unit tests for the empty-stub detection logic used in generate-stdlib-cache.mjs.
 *
 * The detection identifies stubs whose symbol table has no semantic member symbols
 * (methods, constructors, properties, fields, inner types, enum values). Block-scope
 * symbols (kind === 'block') are structural containers, not members, and are excluded.
 *
 * A stub is "empty" when:
 *   allSymbols.every(s => s.parentId === null || s.parentId === 'null' || s.kind === 'block')
 *
 * i.e. there are no non-block symbols with a non-null parentId.
 */

import { CompilerService } from '../../src/parser/compilerService';
import { ApexSymbolCollectorListener } from '../../src/parser/listeners/ApexSymbolCollectorListener';
import { SymbolTable, SymbolKind } from '../../src/types/symbol';
import { enableConsoleLogging, setLogLevel } from '@salesforce/apex-lsp-shared';

/** Mirror of the detection logic in generate-stdlib-cache.mjs */
const hasSemanticMember = (symbolTable: SymbolTable): boolean =>
  symbolTable
    .getAllSymbols()
    .some(
      (s) =>
        s.parentId !== null &&
        s.parentId !== 'null' &&
        s.kind !== SymbolKind.Block,
    );

const compile = (source: string, namespace = 'System'): SymbolTable => {
  const compilerService = new CompilerService(namespace);
  const listener = new ApexSymbolCollectorListener(undefined, 'full');
  const result = compilerService.compile(
    source,
    `file:///test/${namespace}/Test.cls`,
    listener,
    { projectNamespace: namespace, includeComments: false },
  );
  if (!result.result) {
    throw new Error(`Compilation returned null for: ${source}`);
  }
  return result.result;
};

describe('Empty stub detection — hasSemanticMember()', () => {
  beforeEach(() => {
    enableConsoleLogging();
    setLogLevel('error');
  });

  describe('class stubs', () => {
    it('empty class has no semantic members', () => {
      expect(hasSemanticMember(compile('global class Empty {}'))).toBe(false);
    });

    it('class with a method has semantic members', () => {
      expect(
        hasSemanticMember(
          compile('global class WithMethod { public void doIt() {} }'),
        ),
      ).toBe(true);
    });

    it('class with a static method has semantic members', () => {
      expect(
        hasSemanticMember(
          compile(
            'global class WithStatic { public static String get() { return null; } }',
          ),
        ),
      ).toBe(true);
    });

    it('class with a property has semantic members', () => {
      expect(
        hasSemanticMember(
          compile('global class WithProp { public String name; }'),
        ),
      ).toBe(true);
    });

    it('class with only a constructor has semantic members', () => {
      expect(
        hasSemanticMember(
          compile(
            'global class WithCtor { public WithCtor(String s) {} }',
          ),
        ),
      ).toBe(true);
    });

    it('class with an inner class has semantic members', () => {
      expect(
        hasSemanticMember(
          compile('global class Outer { global class Inner {} }'),
        ),
      ).toBe(true);
    });
  });

  describe('interface stubs', () => {
    it('empty interface has no semantic members', () => {
      expect(
        hasSemanticMember(compile('global interface EmptyIface {}')),
      ).toBe(false);
    });

    it('interface with a method signature has semantic members', () => {
      expect(
        hasSemanticMember(
          compile('global interface WithMethod { void doIt(); }'),
        ),
      ).toBe(true);
    });
  });

  describe('enum stubs', () => {
    it('empty enum has no semantic members', () => {
      expect(
        hasSemanticMember(compile('global enum EmptyEnum {}')),
      ).toBe(false);
    });

    it('enum with values has semantic members', () => {
      expect(
        hasSemanticMember(
          compile('global enum Status { ACTIVE, INACTIVE }'),
        ),
      ).toBe(true);
    });
  });
});
