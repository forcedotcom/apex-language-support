/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  ApexSymbolManager,
  SymbolFactory,
  SymbolKind,
  SymbolVisibility,
} from '@salesforce/apex-lsp-parser-ast';

describe('Precise Resolution Test', () => {
  let symbolManager: ApexSymbolManager;

  beforeEach(() => {
    symbolManager = new ApexSymbolManager();
  });

  it('should find class symbol at exact position for hover request', () => {
    // Create a test class symbol
    const classSymbol = SymbolFactory.createFullSymbol(
      'TestClass',
      SymbolKind.Class,
      {
        startLine: 1,
        startColumn: 1,
        endLine: 1,
        endColumn: 20,
      },
      'test.cls',
      {
        visibility: SymbolVisibility.Public,
        isStatic: false,
        isFinal: false,
        isAbstract: false,
        isVirtual: false,
        isOverride: false,
        isTransient: false,
        isTestMethod: false,
        isWebService: false,
        isBuiltIn: false,
      },
      null,
      { interfaces: [] },
      'TestClass',
    );

    // Add the symbol to the manager
    symbolManager.addSymbol(classSymbol, 'test.cls');

    // Test precise resolution at the start of the class name
    const result = symbolManager.getSymbolAtPositionWithStrategy(
      'test.cls',
      { line: 1, character: 1 }, // 1-based line, 0-based column
      'hover',
    );

    expect(result).not.toBeNull();
    expect(result?.name).toBe('TestClass');
    expect(result?.kind).toBe(SymbolKind.Class);
  });

  it('should find method symbol at exact position for hover request', () => {
    // Create a test method symbol
    const methodSymbol = SymbolFactory.createFullSymbol(
      'testMethod',
      SymbolKind.Method,
      {
        startLine: 2,
        startColumn: 5,
        endLine: 2,
        endColumn: 15,
      },
      'test.cls',
      {
        visibility: SymbolVisibility.Public,
        isStatic: false,
        isFinal: false,
        isAbstract: false,
        isVirtual: false,
        isOverride: false,
        isTransient: false,
        isTestMethod: false,
        isWebService: false,
        isBuiltIn: false,
      },
      null,
      { interfaces: [] },
      'testMethod',
    );

    // Add the symbol to the manager
    symbolManager.addSymbol(methodSymbol, 'test.cls');

    // Test precise resolution at the start of the method name
    const result = symbolManager.getSymbolAtPositionWithStrategy(
      'test.cls',
      { line: 2, character: 5 }, // 1-based line, 0-based column
      'hover',
    );

    expect(result).not.toBeNull();
    expect(result?.name).toBe('testMethod');
    expect(result?.kind).toBe(SymbolKind.Method);
  });

  it('should not return containing symbol for hover request', () => {
    // Create a test class symbol (large containing symbol)
    const classSymbol = SymbolFactory.createFullSymbol(
      'TestClass',
      SymbolKind.Class,
      {
        startLine: 1,
        startColumn: 1,
        endLine: 10,
        endColumn: 1,
      },
      'test.cls',
      {
        visibility: SymbolVisibility.Public,
        isStatic: false,
        isFinal: false,
        isAbstract: false,
        isVirtual: false,
        isOverride: false,
        isTransient: false,
        isTestMethod: false,
        isWebService: false,
        isBuiltIn: false,
      },
      null,
      { interfaces: [] },
      'TestClass',
    );

    // Create a test method symbol (small symbol)
    const methodSymbol = SymbolFactory.createFullSymbol(
      'testMethod',
      SymbolKind.Method,
      {
        startLine: 2,
        startColumn: 5,
        endLine: 2,
        endColumn: 15,
      },
      'test.cls',
      {
        visibility: SymbolVisibility.Public,
        isStatic: false,
        isFinal: false,
        isAbstract: false,
        isVirtual: false,
        isOverride: false,
        isTransient: false,
        isTestMethod: false,
        isWebService: false,
        isBuiltIn: false,
      },
      null,
      { interfaces: [] },
      'testMethod',
    );

    // Add both symbols to the manager
    symbolManager.addSymbol(classSymbol, 'test.cls');
    symbolManager.addSymbol(methodSymbol, 'test.cls');

    // Test precise resolution at the method position
    const result = symbolManager.getSymbolAtPositionWithStrategy(
      'test.cls',
      { line: 2, character: 5 }, // 1-based line, 0-based column
      'hover',
    );

    // Should return the method, not the containing class
    expect(result).not.toBeNull();
    expect(result?.name).toBe('testMethod');
    expect(result?.kind).toBe(SymbolKind.Method);
    expect(result?.name).not.toBe('TestClass');
  });
});

