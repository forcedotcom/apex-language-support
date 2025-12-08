/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { CompilerService } from '../../src/parser/compilerService';
import { ApexSymbolCollectorListener } from '../../src/parser/listeners/ApexSymbolCollectorListener';
import {
  ApexSymbol,
  SymbolKind,
  SymbolTable,
  ScopeSymbol,
} from '../../src/types/symbol';
import { isBlockSymbol } from '../../src/utils/symbolNarrowing';
import { enableConsoleLogging, setLogLevel } from '@salesforce/apex-lsp-shared';

describe('ApexSymbolCollectorListener lenient collection on validation errors', () => {
  let compiler: CompilerService;
  let listener: ApexSymbolCollectorListener;

  beforeEach(() => {
    compiler = new CompilerService();
    listener = new ApexSymbolCollectorListener();
    enableConsoleLogging();
    setLogLevel('error');
  });

  it('collects class and members even when class name is reserved (System)', () => {
    const content = `
      global class System {
        public void foo() {}
        private Integer x;
      }
    `;

    const result = compiler.compile<SymbolTable>(
      content,
      'System.cls',
      listener,
    );

    // Expect a semantic error for reserved identifier
    expect(
      result.errors.some((e) =>
        e.message.includes('Identifier name is reserved: System'),
      ),
    ).toBe(true);

    // Symbols should still be collected
    const table = result.result as SymbolTable;
    // Use table.getAllSymbols() to get all symbols including those in file scope
    const allSymbols = table.getAllSymbols();
    const semanticSymbols = allSymbols.filter((s) => !isBlockSymbol(s));
    const systemSymbol = semanticSymbols.find((s) => s.name === 'System');
    expect(systemSymbol?.kind).toBe(SymbolKind.Class);

    // Find class block by parentId pointing to class symbol
    // Class blocks use counter-based names (block1, block2, etc.), not semantic names
    const classScope = systemSymbol
      ? (allSymbols.find(
          (s) =>
            isBlockSymbol(s) &&
            s.scopeType === 'class' &&
            s.parentId === systemSymbol.id,
        ) as ScopeSymbol | undefined)
      : undefined;
    expect(classScope).toBeDefined();

    const allClassSymbols = classScope
      ? table.getSymbolsInScope(classScope.id)
      : [];
    const classSemanticSymbols = allClassSymbols.filter(
      (s) => !isBlockSymbol(s),
    );
    const methodFoo = classSemanticSymbols.find(
      (s: ApexSymbol) => s.kind === SymbolKind.Method && s.name === 'foo',
    );
    const fieldX = classSemanticSymbols.find(
      (s: ApexSymbol) => s.kind === SymbolKind.Field && s.name === 'x',
    );
    expect(methodFoo).toBeDefined();
    expect(fieldX).toBeDefined();
  });

  it('collects interface and methods even when interface name is a reserved type (page)', () => {
    const content = `
      public interface page {
        void m();
      }
    `;

    const result = compiler.compile<SymbolTable>(
      content,
      'page.cls',
      new ApexSymbolCollectorListener(),
    );

    // Expect a semantic error for reserved type identifier
    expect(
      result.errors.some((e) =>
        e.message.includes('Identifier type is reserved: page'),
      ),
    ).toBe(true);

    // Symbols should still be collected
    const table = result.result as SymbolTable;
    // Use table.getAllSymbols() to get all symbols including those in file scope
    const allSymbols = table.getAllSymbols();
    const semanticSymbols = allSymbols.filter((s) => !isBlockSymbol(s));
    const ifaceSymbol = semanticSymbols.find((s) => s.name === 'page');
    expect(ifaceSymbol?.kind).toBe(SymbolKind.Interface);

    // Find interface block by parentId pointing to interface symbol
    // Interface blocks use counter-based names (block1, block2, etc.), not semantic names
    const ifaceScope = ifaceSymbol
      ? (allSymbols.find(
          (s) =>
            isBlockSymbol(s) &&
            s.scopeType === 'class' &&
            s.parentId === ifaceSymbol.id,
        ) as ScopeSymbol | undefined)
      : undefined;
    expect(ifaceScope).toBeDefined();

    const allIfaceSymbols = ifaceScope
      ? table.getSymbolsInScope(ifaceScope.id)
      : [];
    const ifaceSemanticSymbols = allIfaceSymbols.filter(
      (s) => !isBlockSymbol(s),
    );
    const methodM = ifaceSemanticSymbols.find(
      (s: ApexSymbol) => s.kind === SymbolKind.Method && s.name === 'm',
    );
    expect(methodM).toBeDefined();
  });
});
