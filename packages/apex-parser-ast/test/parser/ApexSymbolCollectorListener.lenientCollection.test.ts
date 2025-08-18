/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { CompilerService } from '../../src/parser/compilerService';
import { ApexSymbolCollectorListener } from '../../src/parser/listeners/ApexSymbolCollectorListener';
import { ApexSymbol, SymbolKind, SymbolTable } from '../../src/types/symbol';
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
    const fileScope = table.getCurrentScope();
    const systemSymbol = fileScope
      .getAllSymbols()
      .find((s) => s.name === 'System');
    expect(systemSymbol?.kind).toBe(SymbolKind.Class);

    const classScope = fileScope.getChildren().find((s) => s.name === 'System');
    expect(classScope).toBeDefined();

    const classSymbols = classScope!.getAllSymbols();
    const methodFoo = classSymbols.find(
      (s: ApexSymbol) => s.kind === SymbolKind.Method && s.name === 'foo',
    );
    const fieldX = classSymbols.find(
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
    const fileScope = table.getCurrentScope();
    const ifaceSymbol = fileScope
      .getAllSymbols()
      .find((s) => s.name === 'page');
    expect(ifaceSymbol?.kind).toBe(SymbolKind.Interface);

    const ifaceScope = fileScope.getChildren().find((s) => s.name === 'page');
    expect(ifaceScope).toBeDefined();

    const ifaceSymbols = ifaceScope!.getAllSymbols();
    const methodM = ifaceSymbols.find(
      (s: ApexSymbol) => s.kind === SymbolKind.Method && s.name === 'm',
    );
    expect(methodM).toBeDefined();
  });
});
