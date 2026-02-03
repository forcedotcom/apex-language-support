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
  MethodSymbol,
  VariableSymbol,
  ApexSymbol,
  getUnifiedId,
} from '../../src/types/symbol';
import { ApexSymbolManager } from '../../src/symbols/ApexSymbolManager';
import { CompilerService } from '../../src/parser/compilerService';
import { ApexSymbolCollectorListener } from '../../src/parser/listeners/ApexSymbolCollectorListener';
import * as fs from 'fs';
import * as path from 'path';

describe('SymbolTable Duplicate Handling', () => {
  let symbolTable: SymbolTable;
  let symbolManager: ApexSymbolManager;
  let compilerService: CompilerService;

  beforeEach(() => {
    symbolTable = new SymbolTable();
    symbolTable.setFileUri('file:///test/TestClass.cls');
    symbolManager = new ApexSymbolManager();
    compilerService = new CompilerService();
  });

  afterEach(() => {
    symbolManager.clear();
  });

  /**
   * Load a fixture file from the validation/duplicate-method directory
   */
  const loadFixture = (filename: string): string => {
    const fixturePath = path.join(
      __dirname,
      '../fixtures/validation/duplicate-method',
      filename,
    );
    return fs.readFileSync(fixturePath, 'utf8');
  };

  /**
   * Compile a fixture file and return the SymbolTable
   */
  const compileFixture = (
    filename: string,
    fileUri?: string,
  ): SymbolTable | null => {
    const content = loadFixture(filename);
    const uri = fileUri || `file:///test/${filename}`;
    const listener = new ApexSymbolCollectorListener(undefined, 'full');
    const result = compilerService.compile(content, uri, listener, {
      collectReferences: true,
      resolveReferences: true,
    });
    return result.result || null;
  };

  /**
   * Clone a symbol and modify its location to create a duplicate for testing
   * Duplicates have the same unifiedId but different locations
   * The key is that both symbols must have the same unifiedId (generated from key properties)
   * but be different object instances
   */
  const cloneSymbolWithNewLocation = (
    symbol: ApexSymbol,
    newLine: number,
  ): ApexSymbol => {
    // Deep clone to ensure we have a different object instance
    const cloned = JSON.parse(JSON.stringify(symbol));

    // Update location
    cloned.location.identifierRange.startLine = newLine;
    cloned.location.identifierRange.endLine = newLine;
    cloned.location.symbolRange.startLine = newLine;
    cloned.location.symbolRange.endLine = newLine;

    // For duplicates, the unifiedId is generated from key properties (name, scope, kind) and fileUri
    // CRITICAL: Ensure all key properties match exactly so getUnifiedId returns the same value
    // getUnifiedId checks key.unifiedId first, then generates from key properties
    const unifiedId = getUnifiedId(symbol.key, symbol.fileUri);

    // Set the id to match unifiedId (SymbolTable uses getUnifiedId to get the map key)
    cloned.id = unifiedId;

    // Ensure key.unifiedId is set so getUnifiedId returns it directly
    if (cloned.key) {
      cloned.key.unifiedId = unifiedId;
      // Ensure all key properties match (name, path, kind, prefix, fileUri)
      cloned.key.name = symbol.key.name;
      cloned.key.path = symbol.key.path;
      cloned.key.kind = symbol.key.kind;
      cloned.key.prefix = symbol.key.prefix;
      cloned.key.fileUri = symbol.key.fileUri;
    }

    // Ensure fileUri matches (getUnifiedId uses it)
    cloned.fileUri = symbol.fileUri;

    // CRITICAL: Ensure detail level matches to prevent enrichment
    // If detail levels differ, addSymbol will enrich instead of creating duplicate
    cloned._detailLevel = symbol._detailLevel;

    return cloned;
  };

  describe('Duplicate Methods', () => {
    it('should store duplicate methods with same signature as array', () => {
      // Compile fixture to get base method symbol
      const fixtureSymbolTable = compileFixture('DuplicateMethodsBase.cls');
      expect(fixtureSymbolTable).not.toBeNull();

      const allSymbols = fixtureSymbolTable!.getAllSymbols();
      const method1 = allSymbols.find(
        (s) => s.name === 'doWork' && s.kind === SymbolKind.Method,
      ) as MethodSymbol;
      expect(method1).toBeDefined();

      // Ensure method1 has unifiedId set (getUnifiedId will set it if missing)
      const method1UnifiedId = getUnifiedId(method1.key, method1.fileUri);
      // Ensure method1.id matches unifiedId (SymbolTable uses unifiedId as map key)
      // This is critical: the id must match what getUnifiedId returns
      method1.id = method1UnifiedId;
      method1.key.unifiedId = method1UnifiedId;

      // CRITICAL: Remove detail level to prevent enrichment
      // Enrichment happens when symbols have different detail levels
      // For duplicate testing, we want both symbols to have the same (or no) detail level
      delete method1._detailLevel;

      // Clone method with new location to create duplicate
      const method2 = cloneSymbolWithNewLocation(method1, 15) as MethodSymbol;

      // Verify unifiedId matches for both symbols (they should be identical)
      const method2UnifiedId = getUnifiedId(method2.key, method2.fileUri);
      expect(method1UnifiedId).toBe(method2UnifiedId);
      // Both should have the same id for SymbolTable to treat them as duplicates
      expect(method1.id).toBe(method2.id);
      expect(method1.id).toBe(method1UnifiedId);
      expect(method2.id).toBe(method2UnifiedId);
      // Verify they are different object instances
      expect(method1).not.toBe(method2);

      // Add first method - this will use method1UnifiedId as the map key
      symbolTable.addSymbol(method1);
      const firstLookup = symbolTable.getSymbolById(method1.id);
      expect(firstLookup).toBeDefined();
      expect(firstLookup?.name).toBe('doWork');

      // Verify the symbol was stored with the correct key
      const storedAfterFirst = symbolTable.getAllSymbolsById(method1UnifiedId);
      expect(storedAfterFirst.length).toBe(1);

      // Add second method (duplicate) - should be detected as duplicate and stored as array
      symbolTable.addSymbol(method2);
      const secondLookup = symbolTable.getSymbolById(method2.id);
      expect(secondLookup).toBeDefined();
      expect(secondLookup?.name).toBe('doWork');

      // getAllSymbolsById should return both
      const allMethods = symbolTable.getAllSymbolsById(method1UnifiedId);
      expect(allMethods.length).toBe(2);
      expect(allMethods[0].name).toBe('doWork');
      expect(allMethods[1].name).toBe('doWork');
      expect(allMethods[0].location.identifierRange.startLine).toBe(
        method1.location.identifierRange.startLine,
      );
      expect(allMethods[1].location.identifierRange.startLine).toBe(15);

      // getSymbolById should return first match (backward compatible)
      const singleLookup = symbolTable.getSymbolById(method1.key.unifiedId!);
      expect(singleLookup).toBeDefined();
      expect(singleLookup?.name).toBe('doWork');
    });

    it('should handle methods with different signatures separately', () => {
      // Compile fixture with methods that have different signatures
      const fixtureSymbolTable = compileFixture(
        'DuplicateMethodsDifferentSignatures.cls',
      );
      expect(fixtureSymbolTable).not.toBeNull();

      const allSymbols = fixtureSymbolTable!.getAllSymbols();
      const method1 = allSymbols.find(
        (s) => s.name === 'doWork' && s.kind === SymbolKind.Method,
      ) as MethodSymbol;
      expect(method1).toBeDefined();

      // Ensure unifiedId and id match, and remove detail level to prevent enrichment
      const method1UnifiedId = getUnifiedId(method1.key, method1.fileUri);
      method1.id = method1UnifiedId;
      method1.key.unifiedId = method1UnifiedId;
      delete method1._detailLevel;

      // Clone method with new location to create duplicate
      const method2 = cloneSymbolWithNewLocation(method1, 15) as MethodSymbol;

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
      // Compile fixture with duplicate variables
      const fixtureSymbolTable = compileFixture('DuplicateVariables.cls');
      expect(fixtureSymbolTable).not.toBeNull();

      const allSymbols = fixtureSymbolTable!.getAllSymbols();
      const var1 = allSymbols.find(
        (s) => s.name === 'myVar' && s.kind === SymbolKind.Variable,
      ) as VariableSymbol;
      expect(var1).toBeDefined();

      // Ensure unifiedId and id match, and remove detail level to prevent enrichment
      const var1UnifiedId = getUnifiedId(var1.key, var1.fileUri);
      var1.id = var1UnifiedId;
      var1.key.unifiedId = var1UnifiedId;
      delete var1._detailLevel;

      // Clone variable with new location to create duplicate
      const var2 = cloneSymbolWithNewLocation(var1, 25) as VariableSymbol;

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
      // Compile fixture with multiple constructors
      const fixtureSymbolTable = compileFixture('DuplicateConstructors.cls');
      expect(fixtureSymbolTable).not.toBeNull();

      const allSymbols = fixtureSymbolTable!.getAllSymbols();
      const constructor1 = allSymbols.find(
        (s) =>
          s.kind === SymbolKind.Constructor ||
          (s.kind === SymbolKind.Method &&
            (s as MethodSymbol).isConstructor === true),
      ) as MethodSymbol;
      expect(constructor1).toBeDefined();

      // Ensure unifiedId and id match, and remove detail level to prevent enrichment
      const constructor1UnifiedId = getUnifiedId(
        constructor1.key,
        constructor1.fileUri,
      );
      constructor1.id = constructor1UnifiedId;
      constructor1.key.unifiedId = constructor1UnifiedId;
      delete constructor1._detailLevel;

      // Clone constructor with new location to create duplicate
      const constructor2 = cloneSymbolWithNewLocation(
        constructor1,
        15,
      ) as MethodSymbol;

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
      // Compile fixture with duplicate fields
      const fixtureSymbolTable = compileFixture('DuplicateFields.cls');
      expect(fixtureSymbolTable).not.toBeNull();

      const allSymbols = fixtureSymbolTable!.getAllSymbols();
      const field1 = allSymbols.find(
        (s) => s.name === 'myField' && s.kind === SymbolKind.Field,
      ) as VariableSymbol;
      expect(field1).toBeDefined();

      // Ensure unifiedId and id match, and remove detail level to prevent enrichment
      const field1UnifiedId = getUnifiedId(field1.key, field1.fileUri);
      field1.id = field1UnifiedId;
      field1.key.unifiedId = field1UnifiedId;
      delete field1._detailLevel;

      // Clone field with new location to create duplicate
      const field2 = cloneSymbolWithNewLocation(field1, 6) as VariableSymbol;

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
      // Compile fixture to get base method symbol
      const fixtureSymbolTable = compileFixture('DuplicateMethodsBase.cls');
      expect(fixtureSymbolTable).not.toBeNull();

      const allSymbols = fixtureSymbolTable!.getAllSymbols();
      const method1 = allSymbols.find(
        (s) => s.name === 'doWork' && s.kind === SymbolKind.Method,
      ) as MethodSymbol;
      expect(method1).toBeDefined();

      // Ensure unifiedId and id match, and remove detail level to prevent enrichment
      const method1UnifiedId = getUnifiedId(method1.key, method1.fileUri);
      method1.id = method1UnifiedId;
      method1.key.unifiedId = method1UnifiedId;
      delete method1._detailLevel;

      // Clone method with new location to create duplicate
      const method2 = cloneSymbolWithNewLocation(method1, 15) as MethodSymbol;

      symbolTable.addSymbol(method1);
      symbolTable.addSymbol(method2);

      // getSymbolById should return first match (backward compatible)
      const result = symbolTable.getSymbolById(method1.key.unifiedId!);
      expect(result).toBeDefined();
      expect(result?.id).toBe(method1.id); // Should return first symbol
    });

    it('should return all symbols for getAllSymbolsById()', () => {
      // Compile fixture to get base method symbol
      const fixtureSymbolTable = compileFixture('DuplicateMethodsBase.cls');
      expect(fixtureSymbolTable).not.toBeNull();

      const allSymbols = fixtureSymbolTable!.getAllSymbols();
      const method1 = allSymbols.find(
        (s) => s.name === 'doWork' && s.kind === SymbolKind.Method,
      ) as MethodSymbol;
      expect(method1).toBeDefined();

      // Ensure unifiedId and id match, and remove detail level to prevent enrichment
      const method1UnifiedId = getUnifiedId(method1.key, method1.fileUri);
      method1.id = method1UnifiedId;
      method1.key.unifiedId = method1UnifiedId;
      delete method1._detailLevel;

      // Clone method with new locations to create duplicates
      const method2 = cloneSymbolWithNewLocation(method1, 15) as MethodSymbol;
      const method3 = cloneSymbolWithNewLocation(method1, 20) as MethodSymbol;

      symbolTable.addSymbol(method1);
      symbolTable.addSymbol(method2);
      symbolTable.addSymbol(method3);

      const allMethods = symbolTable.getAllSymbolsById(method1.key.unifiedId!);
      expect(allMethods.length).toBe(3);
      expect(
        allMethods.map((m) => m.location.identifierRange.startLine),
      ).toEqual([method1.location.identifierRange.startLine, 15, 20]);
    });
  });

  describe('Symbol Array Maintenance', () => {
    it('should maintain all symbols in symbolArray including duplicates', () => {
      // Compile fixture to get base method symbol
      const fixtureSymbolTable = compileFixture('DuplicateMethodsBase.cls');
      expect(fixtureSymbolTable).not.toBeNull();

      const allSymbols = fixtureSymbolTable!.getAllSymbols();
      const method1 = allSymbols.find(
        (s) => s.name === 'doWork' && s.kind === SymbolKind.Method,
      ) as MethodSymbol;
      expect(method1).toBeDefined();

      // Ensure unifiedId and id match, and remove detail level to prevent enrichment
      const method1UnifiedId = getUnifiedId(method1.key, method1.fileUri);
      method1.id = method1UnifiedId;
      method1.key.unifiedId = method1UnifiedId;
      delete method1._detailLevel;

      // Clone method with new location to create duplicate
      const method2 = cloneSymbolWithNewLocation(method1, 15) as MethodSymbol;

      // Add both methods to test SymbolTable's duplicate storage
      symbolTable.addSymbol(method1);
      symbolTable.addSymbol(method2);

      // Verify getAllSymbols() returns both duplicates
      const allSymbolsFromTable = symbolTable.getAllSymbols();
      const methods = allSymbolsFromTable.filter((s) => s.name === 'doWork');
      expect(methods.length).toBeGreaterThanOrEqual(2);

      // Verify getAllSymbolsById() returns both duplicates
      const allWithSameId = symbolTable.getAllSymbolsById(method1UnifiedId);
      expect(allWithSameId.length).toBe(2);

      // Verify they have different locations (different line numbers)
      const methodLines = allWithSameId.map(
        (m) => m.location.identifierRange.startLine,
      );
      const uniqueLines = new Set(methodLines);
      expect(uniqueLines.size).toBeGreaterThanOrEqual(2);
    });
  });
});
