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
} from '../../src/types/symbol';
import {
  TypeReferenceFactory,
  ReferenceContext,
} from '../../src/types/typeReference';
import { SymbolTable } from '../../src/types/symbol';

describe('ApexSymbolManager.getSymbolAtPosition', () => {
  let symbolManager: ApexSymbolManager;
  let symbolTable: SymbolTable;

  beforeEach(() => {
    symbolManager = new ApexSymbolManager();
    symbolTable = new SymbolTable();
  });

  describe('same-file symbol resolution', () => {
    it('should find a method symbol at its position', () => {
      // Create a test class with a method
      const classSymbol = SymbolFactory.createFullSymbol(
        'TestClass',
        SymbolKind.Class,
        { startLine: 1, startColumn: 1, endLine: 10, endColumn: 1 },
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

      const methodSymbol = SymbolFactory.createFullSymbol(
        'testMethod',
        SymbolKind.Method,
        { startLine: 3, startColumn: 5, endLine: 5, endColumn: 5 },
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
        classSymbol.id,
      );

      // Add symbols to the manager
      symbolManager.addSymbol(classSymbol, '/test/TestClass.cls', symbolTable);
      symbolManager.addSymbol(methodSymbol, '/test/TestClass.cls', symbolTable);

      // Create a TypeReference for the method call
      const methodReference = TypeReferenceFactory.createMethodCallReference(
        'testMethod',
        { startLine: 7, startColumn: 10, endLine: 7, endColumn: 20 },
        'TestClass',
      );

      // Add the TypeReference to the symbol table
      symbolTable.addTypeReference(methodReference);

      // Register the symbol table with the manager
      symbolManager['symbolGraph'].registerSymbolTable(
        symbolTable,
        '/test/TestClass.cls',
      );

      // Test finding the method at the reference position
      const foundSymbol = symbolManager.getSymbolAtPosition(
        '/test/TestClass.cls',
        { line: 7, character: 15 },
      );

      expect(foundSymbol).toBeDefined();
      expect(foundSymbol?.name).toBe('testMethod');
      expect(foundSymbol?.kind).toBe(SymbolKind.Method);
    });

    it('should find a field symbol at its position', () => {
      // Create a test class with a field
      const classSymbol = SymbolFactory.createFullSymbol(
        'TestClass',
        SymbolKind.Class,
        { startLine: 1, startColumn: 1, endLine: 10, endColumn: 1 },
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

      const fieldSymbol = SymbolFactory.createFullSymbol(
        'testField',
        SymbolKind.Field,
        { startLine: 3, startColumn: 5, endLine: 3, endColumn: 25 },
        '/test/TestClass.cls',
        {
          visibility: SymbolVisibility.Private,
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
        classSymbol.id,
      );

      // Add symbols to the manager
      symbolManager.addSymbol(classSymbol, '/test/TestClass.cls', symbolTable);
      symbolManager.addSymbol(fieldSymbol, '/test/TestClass.cls', symbolTable);

      // Register the symbol table with the manager
      symbolManager['symbolGraph'].registerSymbolTable(
        symbolTable,
        '/test/TestClass.cls',
      );

      // Test finding the field at its declaration position
      const foundSymbol = symbolManager.getSymbolAtPosition(
        '/test/TestClass.cls',
        { line: 3, character: 10 },
      );

      expect(foundSymbol).toBeDefined();
      expect(foundSymbol?.name).toBe('testField');
      expect(foundSymbol?.kind).toBe(SymbolKind.Field);
    });

    it('should return null for position outside symbol bounds', () => {
      // Create a test class
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

  describe('cross-file symbol resolution', () => {
    it('should find built-in type symbols', () => {
      // Create a TypeReference for a built-in type
      const stringReference =
        TypeReferenceFactory.createTypeDeclarationReference(
          'String',
          { startLine: 3, startColumn: 15, endLine: 3, endColumn: 21 },
          'TestClass',
        );

      // Add the TypeReference to the symbol table
      symbolTable.addTypeReference(stringReference);

      // Register the symbol table with the manager
      symbolManager['symbolGraph'].registerSymbolTable(
        symbolTable,
        '/test/TestClass.cls',
      );

      // Test finding the built-in type at the reference position
      const foundSymbol = symbolManager.getSymbolAtPosition(
        '/test/TestClass.cls',
        { line: 3, character: 18 },
      );

      // Note: This test may fail if built-in types aren't loaded
      // In a real scenario, built-in types would be pre-loaded
      expect(foundSymbol).toBeDefined();
    });
  });

  describe('symbol specificity prioritization', () => {
    it('should prioritize more specific symbols when overlapping', () => {
      // Create a class with a method that has the same name as the class
      const classSymbol = SymbolFactory.createFullSymbol(
        'TestClass',
        SymbolKind.Class,
        { startLine: 1, startColumn: 1, endLine: 10, endColumn: 1 },
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

      const methodSymbol = SymbolFactory.createFullSymbol(
        'TestClass', // Same name as class
        SymbolKind.Method,
        { startLine: 3, startColumn: 5, endLine: 5, endColumn: 5 },
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
        classSymbol.id,
      );

      // Add symbols to the manager
      symbolManager.addSymbol(classSymbol, '/test/TestClass.cls', symbolTable);
      symbolManager.addSymbol(methodSymbol, '/test/TestClass.cls', symbolTable);

      // Register the symbol table with the manager
      symbolManager['symbolGraph'].registerSymbolTable(
        symbolTable,
        '/test/TestClass.cls',
      );

      // Test finding symbol at method position (should return method, not class)
      const foundSymbol = symbolManager.getSymbolAtPosition(
        '/test/TestClass.cls',
        { line: 4, character: 10 },
      );

      expect(foundSymbol).toBeDefined();
      expect(foundSymbol?.kind).toBe(SymbolKind.Method);
      expect(foundSymbol?.name).toBe('TestClass');
    });
  });
});
