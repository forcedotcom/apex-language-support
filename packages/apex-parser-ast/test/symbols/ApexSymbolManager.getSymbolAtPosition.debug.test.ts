/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ApexSymbolManager } from '../../src/symbols/ApexSymbolManager';
import {
  SymbolFactory,
  SymbolKind,
  SymbolVisibility,
  SymbolTable,
} from '../../src/types/symbol';
import { enableConsoleLogging, setLogLevel } from '@salesforce/apex-lsp-shared';

describe('ApexSymbolManager.getSymbolAtPosition - Debug', () => {
  let symbolManager: ApexSymbolManager;
  let symbolTable: SymbolTable;

  beforeEach(() => {
    // Enable console logging for debugging
    enableConsoleLogging();
    setLogLevel('error');

    symbolManager = new ApexSymbolManager();
    symbolTable = new SymbolTable();

    // Force the logger to be re-initialized
    const { setLoggerFactory } = require('@salesforce/apex-lsp-shared');
    setLoggerFactory(
      require('@salesforce/apex-lsp-shared').ConsoleLoggerFactory,
    );
  });

  it('should find a symbol at its declaration position', () => {
    // Create a simple class symbol
    const classSymbol = SymbolFactory.createFullSymbol(
      'TestClass',
      SymbolKind.Class,
      { startLine: 1, startColumn: 1, endLine: 5, endColumn: 1 },
      '/test/TestClass.cls',
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
    );

    // Add symbol to the manager
    symbolManager.addSymbol(classSymbol, '/test/TestClass.cls', symbolTable);

    // Register the symbol table with the manager
    symbolManager['symbolGraph'].registerSymbolTable(
      symbolTable,
      '/test/TestClass.cls',
    );

    // Test finding the symbol at its declaration position
    const foundSymbol = symbolManager.getSymbolAtPosition(
      '/test/TestClass.cls',
      { line: 2, character: 5 },
    );

    expect(foundSymbol).toBeDefined();
    expect(foundSymbol?.name).toBe('TestClass');
    expect(foundSymbol?.kind).toBe(SymbolKind.Class);
  });

  it('should return null for position outside symbol bounds', () => {
    // Create a simple class symbol
    const classSymbol = SymbolFactory.createFullSymbol(
      'TestClass',
      SymbolKind.Class,
      { startLine: 1, startColumn: 1, endLine: 5, endColumn: 1 },
      '/test/TestClass.cls',
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
    );

    // Add symbol to the manager
    symbolManager.addSymbol(classSymbol, '/test/TestClass.cls', symbolTable);

    // Register the symbol table with the manager
    symbolManager['symbolGraph'].registerSymbolTable(
      symbolTable,
      '/test/TestClass.cls',
    );

    // Test finding symbol at position outside bounds
    const foundSymbol = symbolManager.getSymbolAtPosition(
      '/test/TestClass.cls',
      { line: 10, character: 1 },
    );

    expect(foundSymbol).toBeNull();
  });
});
