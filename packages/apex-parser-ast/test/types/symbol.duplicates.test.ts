/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  SymbolTable,
  SymbolKind,
  SymbolLocation,
  MethodSymbol,
  VariableSymbol,
  FieldSymbol,
  ApexSymbol,
  SymbolFactory,
} from '../../src/types/symbol';
import { CompilerService } from '../../src/parser/compilerService';
import { ApexSymbolManager } from '../../src/symbols/ApexSymbolManager';

describe('SymbolTable Duplicate Handling', () => {
  let symbolTable: SymbolTable;
  let compilerService: CompilerService;
  let symbolManager: ApexSymbolManager;

  beforeEach(() => {
    symbolTable = new SymbolTable();
    symbolTable.setFileUri('file:///test/TestClass.cls');
    compilerService = new CompilerService();
    symbolManager = new ApexSymbolManager();
  });

  afterEach(() => {
    symbolManager.clear();
  });

  const createLocation = (
    startLine: number,
    startColumn: number = 0,
    endLine: number = startLine,
    endColumn: number = 100,
  ): SymbolLocation => ({
    symbolRange: {
      startLine,
      startColumn,
      endLine,
      endColumn,
    },
    identifierRange: {
      startLine,
      startColumn,
      endLine,
      endColumn,
    },
  });

  describe('Duplicate Methods', () => {
    it('should store duplicate methods with same signature as array', () => {
      const location1 = createLocation(10);
      const location2 = createLocation(15);

      const method1 = SymbolFactory.createFullSymbol(
        'doWork',
        SymbolKind.Method,
        location1,
        'file:///test/TestClass.cls',
        { visibility: 'public' },
        null, // parentId
        undefined, // typeData
        undefined, // fqn
        undefined, // namespace
        undefined, // annotations
        undefined, // identifierLocation
        undefined, // parentSymbol
        ['class', 'TestClass'], // scopePath
      ) as MethodSymbol;
      method1.parameters = [];
      method1.returnType = { name: 'void', originalTypeString: 'void' };

      const method2 = SymbolFactory.createFullSymbol(
        'doWork',
        SymbolKind.Method,
        location2,
        'file:///test/TestClass.cls',
        { visibility: 'public' },
        null, // parentId
        undefined, // typeData
        undefined, // fqn
        undefined, // namespace
        undefined, // annotations
        undefined, // identifierLocation
        undefined, // parentSymbol
        ['class', 'TestClass'], // scopePath
      ) as MethodSymbol;
      method2.parameters = [];
      method2.returnType = { name: 'void', originalTypeString: 'void' };

      // Both methods have same unifiedId (same name, scope, kind)
      expect(method1.key.unifiedId).toBe(method2.key.unifiedId);

      // Add first method
      symbolTable.addSymbol(method1);
      const firstLookup = symbolTable.getSymbolById(method1.id);
      expect(firstLookup).toBeDefined();
      expect(firstLookup?.name).toBe('doWork');

      // Add second method (duplicate)
      symbolTable.addSymbol(method2);
      const secondLookup = symbolTable.getSymbolById(method2.id);
      expect(secondLookup).toBeDefined();
      expect(secondLookup?.name).toBe('doWork');

      // getAllSymbolsById should return both
      const allMethods = symbolTable.getAllSymbolsById(method1.key.unifiedId!);
      expect(allMethods.length).toBe(2);
      expect(allMethods[0].name).toBe('doWork');
      expect(allMethods[1].name).toBe('doWork');
      expect(allMethods[0].location.identifierRange.startLine).toBe(10);
      expect(allMethods[1].location.identifierRange.startLine).toBe(15);

      // getSymbolById should return first match (backward compatible)
      const singleLookup = symbolTable.getSymbolById(method1.key.unifiedId!);
      expect(singleLookup).toBeDefined();
      expect(singleLookup?.name).toBe('doWork');
    });

    it('should handle methods with different signatures separately', () => {
      const location1 = createLocation(10);
      const location2 = createLocation(15);

      const method1 = SymbolFactory.createFullSymbol(
        'doWork',
        SymbolKind.Method,
        location1,
        'file:///test/TestClass.cls',
        { visibility: 'public' },
        null,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        ['class', 'TestClass'],
      ) as MethodSymbol;
      method1.parameters = [];
      method1.returnType = { name: 'void', originalTypeString: 'void' };

      const method2 = SymbolFactory.createFullSymbol(
        'doWork',
        SymbolKind.Method,
        location2,
        'file:///test/TestClass.cls',
        { visibility: 'public' },
        null,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        ['class', 'TestClass'],
      ) as MethodSymbol;
      method2.parameters = [
        {
          name: 'param',
          type: { name: 'String', originalTypeString: 'String' },
        },
      ];
      method2.returnType = { name: 'void', originalTypeString: 'void' };

      // Both methods have same unifiedId (same name, scope, kind - parameters don't affect ID)
      expect(method1.key.unifiedId).toBe(method2.key.unifiedId);

      symbolTable.addSymbol(method1);
      symbolTable.addSymbol(method2);

      // Should have both methods stored
      const allMethods = symbolTable.getAllSymbolsById(method1.key.unifiedId!);
      expect(allMethods.length).toBe(2);
    });
  });

  describe('Duplicate Variables', () => {
    it('should store duplicate variables in same scope as array', () => {
      const location1 = createLocation(20);
      const location2 = createLocation(25);

      const var1 = SymbolFactory.createFullSymbol(
        'myVar',
        SymbolKind.Variable,
        location1,
        'file:///test/TestClass.cls',
        {},
        null,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        ['class', 'TestClass', 'method1'],
      ) as VariableSymbol;
      var1.type = { name: 'String', originalTypeString: 'String' };

      const var2 = SymbolFactory.createFullSymbol(
        'myVar',
        SymbolKind.Variable,
        location2,
        'file:///test/TestClass.cls',
        {},
        null,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        ['class', 'TestClass', 'method1'],
      ) as VariableSymbol;
      var2.type = { name: 'String', originalTypeString: 'String' };

      // Both variables have same unifiedId
      expect(var1.key.unifiedId).toBe(var2.key.unifiedId);

      symbolTable.addSymbol(var1);
      symbolTable.addSymbol(var2);

      const allVars = symbolTable.getAllSymbolsById(var1.key.unifiedId!);
      expect(allVars.length).toBe(2);
      expect(allVars[0].name).toBe('myVar');
      expect(allVars[1].name).toBe('myVar');
    });
  });

  describe('Duplicate Constructors', () => {
    it('should store duplicate constructors as array', () => {
      const location1 = createLocation(10);
      const location2 = createLocation(15);

      const constructor1 = SymbolFactory.createFullSymbol(
        'MyClass',
        SymbolKind.Constructor,
        location1,
        'file:///test/TestClass.cls',
        { visibility: 'public' },
        null,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        ['class', 'MyClass'],
      ) as MethodSymbol;
      constructor1.isConstructor = true;
      constructor1.parameters = [];
      constructor1.returnType = { name: 'void', originalTypeString: 'void' };

      const constructor2 = SymbolFactory.createFullSymbol(
        'MyClass',
        SymbolKind.Constructor,
        location2,
        'file:///test/TestClass.cls',
        { visibility: 'public' },
        null,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        ['class', 'MyClass'],
      ) as MethodSymbol;
      constructor2.isConstructor = true;
      constructor2.parameters = [];
      constructor2.returnType = { name: 'void', originalTypeString: 'void' };

      // Both constructors have same unifiedId (same name, scope, kind)
      expect(constructor1.key.unifiedId).toBe(constructor2.key.unifiedId);

      symbolTable.addSymbol(constructor1);
      symbolTable.addSymbol(constructor2);

      const allConstructors = symbolTable.getAllSymbolsById(
        constructor1.key.unifiedId!,
      );
      expect(allConstructors.length).toBe(2);
      expect(allConstructors[0].name).toBe('MyClass');
      expect(allConstructors[1].name).toBe('MyClass');
      expect(allConstructors[0].kind).toBe(SymbolKind.Constructor);
      expect(allConstructors[1].kind).toBe(SymbolKind.Constructor);
    });
  });

  describe('Duplicate Fields', () => {
    it('should store duplicate fields as array', () => {
      const location1 = createLocation(5);
      const location2 = createLocation(6);

      const field1 = SymbolFactory.createFullSymbol(
        'myField',
        SymbolKind.Field,
        location1,
        'file:///test/TestClass.cls',
        { visibility: 'public' },
        null,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        ['class', 'TestClass'],
      ) as FieldSymbol;
      field1.type = { name: 'String', originalTypeString: 'String' };

      const field2 = SymbolFactory.createFullSymbol(
        'myField',
        SymbolKind.Field,
        location2,
        'file:///test/TestClass.cls',
        { visibility: 'public' },
        null,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        ['class', 'TestClass'],
      ) as FieldSymbol;
      field2.type = { name: 'String', originalTypeString: 'String' };

      // Both fields have same unifiedId
      expect(field1.key.unifiedId).toBe(field2.key.unifiedId);

      symbolTable.addSymbol(field1);
      symbolTable.addSymbol(field2);

      const allFields = symbolTable.getAllSymbolsById(field1.key.unifiedId!);
      expect(allFields.length).toBe(2);
      expect(allFields[0].name).toBe('myField');
      expect(allFields[1].name).toBe('myField');
      expect(allFields[0].kind).toBe(SymbolKind.Field);
      expect(allFields[1].kind).toBe(SymbolKind.Field);
    });
  });

  describe('Symbol Lookup with Duplicates', () => {
    it('should return first match for getSymbolById()', () => {
      const location1 = createLocation(10);
      const location2 = createLocation(15);

      const method1 = SymbolFactory.createFullSymbol(
        'doWork',
        SymbolKind.Method,
        location1,
        'file:///test/TestClass.cls',
        { visibility: 'public' },
        null,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        ['class', 'TestClass'],
      ) as MethodSymbol;
      method1.parameters = [];
      method1.returnType = { name: 'void', originalTypeString: 'void' };

      const method2 = SymbolFactory.createFullSymbol(
        'doWork',
        SymbolKind.Method,
        location2,
        'file:///test/TestClass.cls',
        { visibility: 'public' },
        null,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        ['class', 'TestClass'],
      ) as MethodSymbol;
      method2.parameters = [];
      method2.returnType = { name: 'void', originalTypeString: 'void' };

      symbolTable.addSymbol(method1);
      symbolTable.addSymbol(method2);

      // getSymbolById should return first match (backward compatible)
      const result = symbolTable.getSymbolById(method1.key.unifiedId!);
      expect(result).toBeDefined();
      expect(result?.id).toBe(method1.id); // Should return first symbol
    });

    it('should return all symbols for getAllSymbolsById()', () => {
      const location1 = createLocation(10);
      const location2 = createLocation(15);
      const location3 = createLocation(20);

      const method1 = SymbolFactory.createFullSymbol(
        'doWork',
        SymbolKind.Method,
        location1,
        'file:///test/TestClass.cls',
        { visibility: 'public' },
        null,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        ['class', 'TestClass'],
      ) as MethodSymbol;
      method1.parameters = [];
      method1.returnType = { name: 'void', originalTypeString: 'void' };

      const method2 = SymbolFactory.createFullSymbol(
        'doWork',
        SymbolKind.Method,
        location2,
        'file:///test/TestClass.cls',
        { visibility: 'public' },
        null,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        ['class', 'TestClass'],
      ) as MethodSymbol;
      method2.parameters = [];
      method2.returnType = { name: 'void', originalTypeString: 'void' };

      const method3 = SymbolFactory.createFullSymbol(
        'doWork',
        SymbolKind.Method,
        location3,
        'file:///test/TestClass.cls',
        { visibility: 'public' },
        null,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        ['class', 'TestClass'],
      ) as MethodSymbol;
      method3.parameters = [];
      method3.returnType = { name: 'void', originalTypeString: 'void' };

      symbolTable.addSymbol(method1);
      symbolTable.addSymbol(method2);
      symbolTable.addSymbol(method3);

      const allMethods = symbolTable.getAllSymbolsById(method1.key.unifiedId!);
      expect(allMethods.length).toBe(3);
      expect(allMethods.map((m) => m.location.identifierRange.startLine)).toEqual([
        10, 15, 20,
      ]);
    });
  });

  describe('Symbol Array Maintenance', () => {
    it('should maintain all symbols in symbolArray including duplicates', () => {
      const location1 = createLocation(10);
      const location2 = createLocation(15);

      const method1 = SymbolFactory.createFullSymbol(
        'doWork',
        SymbolKind.Method,
        location1,
        'file:///test/TestClass.cls',
        { visibility: 'public' },
        null,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        ['class', 'TestClass'],
      ) as MethodSymbol;
      method1.parameters = [];
      method1.returnType = { name: 'void', originalTypeString: 'void' };

      const method2 = SymbolFactory.createFullSymbol(
        'doWork',
        SymbolKind.Method,
        location2,
        'file:///test/TestClass.cls',
        { visibility: 'public' },
        null,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        ['class', 'TestClass'],
      ) as MethodSymbol;
      method2.parameters = [];
      method2.returnType = { name: 'void', originalTypeString: 'void' };

      symbolTable.addSymbol(method1);
      symbolTable.addSymbol(method2);

      const allSymbols = symbolTable.getAllSymbols();
      const methods = allSymbols.filter((s) => s.name === 'doWork');
      expect(methods.length).toBe(2);
      expect(methods.map((m) => m.location.identifierRange.startLine)).toEqual([
        10, 15,
      ]);
    });
  });
});
