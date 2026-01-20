/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as fs from 'fs';
import * as path from 'path';
import { ApexSymbolManager } from '../../src/symbols/ApexSymbolManager';
import { CompilerService } from '../../src/parser/compilerService';
import { ApexSymbolCollectorListener } from '../../src/parser/listeners/ApexSymbolCollectorListener';
import { enableConsoleLogging, setLogLevel } from '@salesforce/apex-lsp-shared';
import {
  initialize as schedulerInitialize,
  shutdown as schedulerShutdown,
  reset as schedulerReset,
} from '../../src/queue/priority-scheduler-utils';
import { Effect } from 'effect';
import {
  initializeResourceLoaderForTests,
  resetResourceLoader,
} from '../helpers/testHelpers';

describe('ApexSymbolManager.getSymbolAtPosition', () => {
  let symbolManager: ApexSymbolManager;
  let compilerService: CompilerService;

  beforeAll(async () => {
    // Initialize scheduler before all tests
    await Effect.runPromise(
      schedulerInitialize({
        queueCapacity: 100,
        maxHighPriorityStreak: 50,
        idleSleepMs: 1,
      }),
    );
    // Initialize ResourceLoader with StandardApexLibrary.zip for built-in type resolution
    await initializeResourceLoaderForTests({
      loadMode: 'lazy',
      preloadStdClasses: false,
    });
  });

  afterAll(async () => {
    // Wait for any remaining scheduler tasks to complete
    await new Promise((resolve) => setTimeout(resolve, 200));
    // Shutdown the scheduler first to stop the background loop
    try {
      await Effect.runPromise(schedulerShutdown());
    } catch (_error) {
      // Ignore errors - scheduler might not be initialized or already shut down
    }
    // Reset scheduler state after shutdown
    try {
      await Effect.runPromise(schedulerReset());
    } catch (_error) {
      // Ignore errors - scheduler might not be initialized
    }
    // Reset ResourceLoader
    resetResourceLoader();
    // Additional delay to ensure scheduler fully shuts down
    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  beforeEach(() => {
    // Enable console logging with debug level for tests
    enableConsoleLogging();
    setLogLevel('debug'); // Set to 'debug' to see logger.debug messages

    symbolManager = new ApexSymbolManager();
    compilerService = new CompilerService();
  });

  afterEach(() => {
    symbolManager.clear();
  });

  describe('same-file symbol resolution', () => {
    it('should find a method symbol at its position', async () => {
      // Read Apex source from fixture file
      const apexSource = fs.readFileSync(
        path.join(__dirname, '../fixtures/position/TestClass.cls'),
        'utf8',
      );

      // Parse the source and add symbols to the manager
      const listener = new ApexSymbolCollectorListener(undefined, 'full');
      const result = compilerService.compile(
        apexSource,
        '/test/TestClass.cls',
        listener,
      );

      if (result.result) {
        await Effect.runPromise(
          symbolManager.addSymbolTable(
            result.result,
            'file:///test/TestClass.cls',
          ),
        );
      }

      // Test finding the method symbol at its position (line 2, character 20)
      const foundSymbol = await symbolManager.getSymbolAtPosition(
        'file:///test/TestClass.cls',
        { line: 2, character: 20 },
      );

      expect(foundSymbol).toBeDefined();
      expect(foundSymbol?.kind).toBe('method');
      expect(foundSymbol?.name).toBe('myMethod');
    });

    it('should find a field symbol at its position', async () => {
      // Read Apex source from fixture file
      const apexSource = fs.readFileSync(
        path.join(__dirname, '../fixtures/position/TestClassWithField.cls'),
        'utf8',
      );

      // Parse the source and add symbols to the manager
      const listener = new ApexSymbolCollectorListener(undefined, 'full');
      const result = compilerService.compile(
        apexSource,
        '/test/TestClassWithField.cls',
        listener,
      );

      if (result.result) {
        await Effect.runPromise(
          symbolManager.addSymbolTable(
            result.result,
            'file:///test/TestClassWithField.cls',
          ),
        );
      }

      // Test finding the field symbol at its position
      const foundSymbol = await symbolManager.getSymbolAtPosition(
        'file:///test/TestClassWithField.cls',
        { line: 2, character: 20 },
      );

      expect(foundSymbol).toBeDefined();
      expect(foundSymbol?.kind).toBe('field');
      expect(foundSymbol?.name).toBe('testField');
    });

    it('should find a class symbol at its position', async () => {
      // Read Apex source from fixture file
      const apexSource = fs.readFileSync(
        path.join(__dirname, '../fixtures/position/TestClassSimple.cls'),
        'utf8',
      );

      // Parse the source and add symbols to the manager
      const listener = new ApexSymbolCollectorListener(undefined, 'full');
      const result = compilerService.compile(
        apexSource,
        '/test/TestClassSimple.cls',
        listener,
      );

      if (result.result) {
        await Effect.runPromise(
          symbolManager.addSymbolTable(
            result.result,
            'file:///test/TestClassSimple.cls',
          ),
        );
      }

      // Test finding the class symbol at its position
      const foundSymbol = await symbolManager.getSymbolAtPosition(
        'file:///test/TestClassSimple.cls',
        { line: 1, character: 13 }, // Class name position (within the class bounds)
      );

      expect(foundSymbol).toBeDefined();
      expect(foundSymbol?.kind).toBe('class');
      expect(foundSymbol?.name).toBe('TestClassSimple');
    });

    it('should find a variable symbol at its position', async () => {
      // Read Apex source from fixture file
      const apexSource = fs.readFileSync(
        path.join(__dirname, '../fixtures/position/TestClassWithVariable.cls'),
        'utf8',
      );

      // Parse the source and add symbols to the manager
      const listener = new ApexSymbolCollectorListener(undefined, 'full');
      const result = compilerService.compile(
        apexSource,
        '/test/TestClassWithVariable.cls',
        listener,
      );

      if (result.result) {
        await Effect.runPromise(
          symbolManager.addSymbolTable(
            result.result,
            'file:///test/TestClassWithVariable.cls',
          ),
        );
      }

      // Test finding the variable symbol at its position
      const foundSymbol = await symbolManager.getSymbolAtPosition(
        'file:///test/TestClassWithVariable.cls',
        { line: 3, character: 15 }, // Variable position (within the variable name range)
      );

      expect(foundSymbol).toBeDefined();
      expect(foundSymbol?.kind).toBe('variable');
      expect(foundSymbol?.name).toBe('test');
    });

    it('should prioritize more specific symbols when overlapping', async () => {
      // Read Apex source from fixture file
      const apexSource = fs.readFileSync(
        path.join(__dirname, '../fixtures/position/TestClassOverlapping.cls'),
        'utf8',
      );

      // Parse the source and add symbols to the manager
      const listener = new ApexSymbolCollectorListener(undefined, 'full');
      const result = compilerService.compile(
        apexSource,
        '/test/TestClassOverlapping.cls',
        listener,
      );

      if (result.result) {
        await Effect.runPromise(
          symbolManager.addSymbolTable(
            result.result,
            'file:///test/TestClassOverlapping.cls',
          ),
        );
      }

      // Test finding the method symbol at its position (should prioritize method over class)
      const foundSymbol = await symbolManager.getSymbolAtPosition(
        'file:///test/TestClassOverlapping.cls',
        { line: 2, character: 16 }, // Method position
      );

      expect(foundSymbol).toBeDefined();
      expect(foundSymbol?.kind).toBe('method');
      expect(foundSymbol?.name).toBe('myMethod');
    });
  });

  describe('scope-based resolution for shadowed variables', () => {
    it('should resolve to local variable when shadowing class field in method1', async () => {
      // Read Apex source from fixture file
      const apexSource = fs.readFileSync(
        path.join(__dirname, '../fixtures/position/ScopeExample.cls'),
        'utf8',
      );

      const listener = new ApexSymbolCollectorListener(undefined, 'full');
      const result = compilerService.compile(
        apexSource,
        'file:///ScopeExample.cls',
        listener,
      );

      if (result.result) {
        await Effect.runPromise(
          symbolManager.addSymbolTable(
            result.result,
            'file:///ScopeExample.cls',
          ),
        );
      }

      // Find the local variable 'a' in method1 (line 8, character 15)
      // Position is 1-based line, 0-based column (parser format)
      const foundSymbol = await symbolManager.getSymbolAtPosition(
        'file:///ScopeExample.cls',
        { line: 8, character: 15 }, // Position on 'a' in "String b = a;"
        'precise',
      );

      expect(foundSymbol).toBeDefined();
      expect(foundSymbol?.kind).toBe('variable');
      expect(foundSymbol?.name).toBe('a');
      // Verify it's the local variable, not the class field
      // The local variable should be in method1's scope
      expect(foundSymbol?.parentId).toBeDefined();
      // Check that it's not the class field by verifying parentId doesn't point to class block
      const allSymbols = result.result?.getAllSymbols() || [];
      const classField = allSymbols.find(
        (s) => s.name === 'a' && s.kind === 'field',
      );
      expect(classField).toBeDefined();
      expect(foundSymbol?.id).not.toBe(classField?.id);
    });

    it('should resolve to local variable when shadowing class field in method2', async () => {
      // Read Apex source from fixture file
      const apexSource = fs.readFileSync(
        path.join(__dirname, '../fixtures/position/ScopeExample.cls'),
        'utf8',
      );

      const listener = new ApexSymbolCollectorListener(undefined, 'full');
      const result = compilerService.compile(
        apexSource,
        'file:///ScopeExample.cls',
        listener,
      );

      if (result.result) {
        await Effect.runPromise(
          symbolManager.addSymbolTable(
            result.result,
            'file:///ScopeExample.cls',
          ),
        );
      }

      // Find the local variable 'a' in method2 (line 13, character 15)
      const foundSymbol = await symbolManager.getSymbolAtPosition(
        'file:///ScopeExample.cls',
        { line: 13, character: 15 }, // Position on 'a' in "String b = a;"
        'precise',
      );

      expect(foundSymbol).toBeDefined();
      expect(foundSymbol?.kind).toBe('variable');
      expect(foundSymbol?.name).toBe('a');
      // Verify it's the local variable in method2, not method1's or the class field
      const allSymbols = result.result?.getAllSymbols() || [];
      const classField = allSymbols.find(
        (s) => s.name === 'a' && s.kind === 'field',
      );
      const method1Local = allSymbols.find(
        (s) =>
          s.name === 'a' &&
          s.kind === 'variable' &&
          s.location.symbolRange.startLine === 8,
      );
      expect(foundSymbol?.id).not.toBe(classField?.id);
      expect(foundSymbol?.id).not.toBe(method1Local?.id);
    });

    it('should resolve to class field when no local variable shadows it in method3', async () => {
      // Read Apex source from fixture file
      const apexSource = fs.readFileSync(
        path.join(__dirname, '../fixtures/position/ScopeExample.cls'),
        'utf8',
      );

      const listener = new ApexSymbolCollectorListener(undefined, 'full');
      const result = compilerService.compile(
        apexSource,
        'file:///ScopeExample.cls',
        listener,
      );

      if (result.result) {
        await Effect.runPromise(
          symbolManager.addSymbolTable(
            result.result,
            'file:///ScopeExample.cls',
          ),
        );
      }

      // Find the class field 'a' in method3 (line 18, character 19)
      const foundSymbol = await symbolManager.getSymbolAtPosition(
        'file:///ScopeExample.cls',
        { line: 18, character: 19 }, // Position on 'a' in "String b = a;"
        'precise',
      );

      expect(foundSymbol).toBeDefined();
      expect(foundSymbol?.kind).toBe('field');
      expect(foundSymbol?.name).toBe('a');
      // Verify it's the class field, not a local variable
      const allSymbols = result.result?.getAllSymbols() || [];
      const localVariables = allSymbols.filter(
        (s) => s.name === 'a' && s.kind === 'variable',
      );
      // Should have 2 local variables (in method1 and method2), but not in method3
      expect(localVariables.length).toBe(2);
      // The found symbol should be the class field
      const classField = allSymbols.find(
        (s) => s.name === 'a' && s.kind === 'field',
      );
      expect(foundSymbol?.id).toBe(classField?.id);
    });

    it('should resolve to correct variable when multiple methods have same variable name', async () => {
      // Read Apex source from fixture file
      const apexSource = fs.readFileSync(
        path.join(__dirname, '../fixtures/position/ScopeExample.cls'),
        'utf8',
      );

      const listener = new ApexSymbolCollectorListener(undefined, 'full');
      const result = compilerService.compile(
        apexSource,
        'file:///ScopeExample.cls',
        listener,
      );

      if (result.result) {
        await Effect.runPromise(
          symbolManager.addSymbolTable(
            result.result,
            'file:///ScopeExample.cls',
          ),
        );
      }

      const allSymbols = result.result?.getAllSymbols() || [];

      // Test method1 - should resolve to method1's local variable
      // Position on 'a' in "String b = a;" at line 9, column 19-20
      const method1Symbol = await symbolManager.getSymbolAtPosition(
        'file:///ScopeExample.cls',
        { line: 9, character: 19 }, // Position on 'a' in method1
        'precise',
      );
      expect(method1Symbol).toBeDefined();
      expect(method1Symbol?.kind).toBe('variable');
      expect(method1Symbol?.name).toBe('a');
      const method1Local = allSymbols.find(
        (s) =>
          s.name === 'a' &&
          s.kind === 'variable' &&
          s.location.symbolRange.startLine === 8,
      );
      expect(method1Symbol?.id).toBe(method1Local?.id);

      // Test method2 - should resolve to method2's local variable
      // Position on 'a' in "String b = a;" at line 14, column 19-20
      const method2Symbol = await symbolManager.getSymbolAtPosition(
        'file:///ScopeExample.cls',
        { line: 14, character: 19 }, // Position on 'a' in method2
        'precise',
      );
      expect(method2Symbol).toBeDefined();
      expect(method2Symbol?.kind).toBe('variable');
      expect(method2Symbol?.name).toBe('a');
      const method2Local = allSymbols.find(
        (s) =>
          s.name === 'a' &&
          s.kind === 'variable' &&
          s.location.symbolRange.startLine === 13,
      );
      expect(method2Symbol?.id).toBe(method2Local?.id);
      // Verify it's different from method1's variable
      expect(method2Symbol?.id).not.toBe(method1Symbol?.id);

      // Test method3 - should resolve to class field
      // Position on 'a' in "String b = a;" at line 18, column 19-20
      const method3Symbol = await symbolManager.getSymbolAtPosition(
        'file:///ScopeExample.cls',
        { line: 18, character: 19 }, // Position on 'a' in method3
        'precise',
      );
      expect(method3Symbol).toBeDefined();
      expect(method3Symbol?.kind).toBe('field');
      expect(method3Symbol?.name).toBe('a');
      const classField = allSymbols.find(
        (s) => s.name === 'a' && s.kind === 'field',
      );
      expect(method3Symbol?.id).toBe(classField?.id);
      // Verify it's different from both local variables
      expect(method3Symbol?.id).not.toBe(method1Symbol?.id);
      expect(method3Symbol?.id).not.toBe(method2Symbol?.id);
    });
  });

  describe('list operations symbol resolution', () => {
    // Helper function to set up the test fixture
    const setupFixture = async () => {
      // Read Apex source from fixture file
      const apexSource = fs.readFileSync(
        path.join(__dirname, '../fixtures/position/TestListOperations.cls'),
        'utf8',
      );

      // Parse the source and add symbols to the manager
      const listener = new ApexSymbolCollectorListener(undefined, 'full');
      const result = compilerService.compile(
        apexSource,
        '/test/TestListOperations.cls',
        listener,
      );

      if (result.result) {
        await Effect.runPromise(
          symbolManager.addSymbolTable(
            result.result,
            'file:///test/TestListOperations.cls',
          ),
        );
      }

      // Wait for deferred processing to complete (needed for built-in method resolution)
      await new Promise((resolve) => setTimeout(resolve, 100));

      return apexSource;
    };

    it('should resolve Integer type parameter in new List<Integer> to System.Integer', async () => {
      const apexSource = await setupFixture();
      const lines = apexSource.split('\n');

      // Find 'Integer' in "new List<Integer>..." (line 3)
      const declarationLine = 2; // 0-based index, line 3 in file
      const declarationLineText = lines[declarationLine];
      // Find "Integer" after "new List<" (the second occurrence)
      const newListIndex = declarationLineText.indexOf('new List<');
      expect(newListIndex).toBeGreaterThanOrEqual(0);
      const integerIndex = newListIndex + 'new List<'.length;
      expect(
        declarationLineText.substring(integerIndex, integerIndex + 7),
      ).toBe('Integer');

      const position = {
        line: declarationLine + 1, // 1-based line number
        character: integerIndex,
      };

      // Debug: Check what references exist at this position
      const referencesAtPosition = symbolManager.getReferencesAtPosition(
        'file:///test/TestListOperations.cls',
        position,
      );
      console.log(
        `[DEBUG] Found ${referencesAtPosition.length} references at position ${position.line}:${position.character}`,
      );
      referencesAtPosition.forEach((ref, idx) => {
        console.log(
          `[DEBUG] Reference ${idx}: name="${ref.name}", context=${ref.context}, location=${ref.location.identifierRange.startLine}:${ref.location.identifierRange.startColumn}-${ref.location.identifierRange.endLine}:${ref.location.identifierRange.endColumn}`,
        );
      });

      const symbol = await symbolManager.getSymbolAtPosition(
        'file:///test/TestListOperations.cls',
        position,
        'precise', // Use precise strategy to resolve type parameters
      );

      // Should resolve to System.Integer (built-in type)
      expect(symbol).toBeDefined();
      expect(symbol?.kind).toBe('class');
      expect(symbol?.name).toBe('Integer');
      // Verify it's a built-in type (System.Integer)
      expect(
        symbol?.namespace?.toString() === 'System' ||
          symbol?.fileUri?.includes('System') ||
          symbol?.fileUri?.includes('Integer') ||
          symbol?.modifiers?.isBuiltIn === true,
      ).toBe(true);
    });

    it('should resolve numbers variable to System.List<System.Integer>', async () => {
      const apexSource = await setupFixture();
      const lines = apexSource.split('\n');

      // Find 'numbers' in "System.assertEquals(5, numbers.size(), ...)" (line 4)
      const sizeCallLine = 3; // 0-based index, line 4 in file
      const sizeCallLineText = lines[sizeCallLine];
      const numbersIndex = sizeCallLineText.indexOf('numbers');
      expect(numbersIndex).toBeGreaterThanOrEqual(0);

      const symbol = await symbolManager.getSymbolAtPosition(
        'file:///test/TestListOperations.cls',
        {
          line: sizeCallLine + 1, // 1-based line number
          character: numbersIndex,
        },
      );

      expect(symbol).toBeDefined();
      // Should resolve to the variable 'numbers' with type System.List<System.Integer>
      expect(symbol?.kind).toBe('variable');
      expect(symbol?.name).toBe('numbers');
      // Verify the variable's type is System.List<System.Integer>
      expect(symbol?.type?.name).toBeDefined();
      const typeName = symbol?.type?.name || '';
      const originalTypeString =
        (symbol?.type as any)?.originalTypeString || '';
      // Type name might be just "List" but originalTypeString should contain "List<Integer>"
      expect(typeName).toBe('List');
      // Check if generic types are present in originalTypeString or genericTypes
      const genericTypes = (symbol?.type as any)?.genericTypes || [];
      const hasIntegerGeneric =
        originalTypeString.includes('Integer') ||
        genericTypes.some(
          (gt: any) => gt?.name === 'Integer' || gt === 'Integer',
        );
      // Log actual type for verification
      console.log(
        `[INFO] numbers variable has type: name=${typeName}, originalTypeString=${originalTypeString}, genericTypes=${JSON.stringify(genericTypes)}`,
      );
      expect(hasIntegerGeneric).toBe(true);
    });

    it('should resolve size method call to System.List.size()', async () => {
      const apexSource = await setupFixture();
      const lines = apexSource.split('\n');

      // Find 'size' in "System.assertEquals(5, numbers.size(), ...)" (line 4)
      const sizeCallLine = 3; // 0-based index, line 4 in file
      const sizeCallLineText = lines[sizeCallLine];
      // Find position after "numbers." to get "size"
      const numbersDotIndex = sizeCallLineText.indexOf('numbers.');
      expect(numbersDotIndex).toBeGreaterThanOrEqual(0);
      const sizeIndex = numbersDotIndex + 'numbers.'.length;
      expect(sizeCallLineText.substring(sizeIndex, sizeIndex + 4)).toBe('size');

      const position = {
        line: sizeCallLine + 1, // 1-based line number
        character: sizeIndex,
      };

      // Debug: Check what references exist at this position
      const referencesAtPosition = symbolManager.getReferencesAtPosition(
        'file:///test/TestListOperations.cls',
        position,
      );
      console.log(
        `[DEBUG] Found ${referencesAtPosition.length} references at position ${position.line}:${position.character} for 'size'`,
      );
      referencesAtPosition.forEach((ref, idx) => {
        console.log(
          `[DEBUG] Reference ${idx}: name="${ref.name}", context=${ref.context}, location=${ref.location.identifierRange.startLine}:${ref.location.identifierRange.startColumn}-${ref.location.identifierRange.endLine}:${ref.location.identifierRange.endColumn}`,
        );
        if ((ref as any).chainNodes) {
          console.log(
            `[DEBUG]   Chain nodes: ${JSON.stringify((ref as any).chainNodes.map((n: any) => n.name))}`,
          );
        }
      });

      // Debug: Check if List type can be resolved in the variable declaration
      // Find "List" in "List<Integer> numbers = ..." (line 3, 0-based index 2)
      const listDeclLine = 2; // 0-based index, line 3 in file
      const listDeclLineText = lines[listDeclLine];
      const listIndex = listDeclLineText.indexOf('List');
      expect(listIndex).toBeGreaterThanOrEqual(0);

      const listTypePosition = {
        line: listDeclLine + 1, // 1-based line number
        character: listIndex, // Position at "List"
      };

      const listTypeSymbol = await symbolManager.getSymbolAtPosition(
        'file:///test/TestListOperations.cls',
        listTypePosition,
        'precise',
      );

      console.log(
        `[DEBUG] List type resolution: ${listTypeSymbol ? `${listTypeSymbol.name} (${listTypeSymbol.kind}, fileUri=${listTypeSymbol.fileUri})` : 'null'}`,
      );

      // Debug: Check what the numbers variable resolves to and its type
      const numbersRefs = symbolManager.getReferencesAtPosition(
        'file:///test/TestListOperations.cls',
        {
          line: sizeCallLine + 1,
          character: sizeCallLineText.indexOf('numbers'),
        },
      );
      if (numbersRefs.length > 0) {
        const numbersSymbol = await symbolManager.getSymbolAtPosition(
          'file:///test/TestListOperations.cls',
          {
            line: sizeCallLine + 1,
            character: sizeCallLineText.indexOf('numbers'),
          },
        );
        if (numbersSymbol && numbersSymbol.kind === 'variable') {
          const varType = (numbersSymbol as any).type;
          console.log(
            `[DEBUG] numbers variable type: name=${varType?.name}, isBuiltIn=${varType?.isBuiltIn}, resolvedSymbol=${varType?.resolvedSymbol?.name || 'null'}`,
          );
        }
      }

      // Debug: Check which reference gets selected
      const allRefs = symbolManager.getReferencesAtPosition(
        'file:///test/TestListOperations.cls',
        position,
      );
      console.log(
        `[DEBUG] All references at position: ${allRefs.map((r) => `${r.name} (${r.context})`).join(', ')}`,
      );

      const symbol = await symbolManager.getSymbolAtPosition(
        'file:///test/TestListOperations.cls',
        position,
        'precise', // Use precise strategy for method calls
      );

      console.log(
        `[DEBUG] Resolved symbol: ${symbol ? `${symbol.name} (${symbol.kind})` : 'null'}`,
      );

      // Should resolve to the 'size' method on System.List
      expect(symbol).toBeDefined();
      expect(symbol?.kind).toBe('method');
      expect(symbol?.name).toBe('size');
      // Verify it's a method on System.List (built-in type)
      // Methods on built-in types may have namespace 'System' or fileUri indicating System namespace
      expect(
        symbol?.namespace?.toString() === 'System' ||
          symbol?.fileUri?.includes('System') ||
          symbol?.fileUri?.includes('List') ||
          symbol?.modifiers?.isBuiltIn === true,
      ).toBe(true);
    });

    it('should inspect symbol classification in List.cls and TestListOperations.cls', async () => {
      const apexSource = await setupFixture();

      // Force List to be loaded by resolving a reference to it
      const lines = apexSource.split('\n');
      const listDeclLine = 2; // Line 3: "List<Integer> numbers = ..."
      const listDeclLineText = lines[listDeclLine];
      const listIndex = listDeclLineText.indexOf('List');

      // This will trigger List.cls to be loaded
      await symbolManager.getSymbolAtPosition(
        'file:///test/TestListOperations.cls',
        {
          line: listDeclLine + 1,
          character: listIndex,
        },
        'precise',
      );

      // Wait for List to be loaded
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Find List symbols to determine the correct file URI
      const listSymbols = symbolManager.findSymbolByName('List');
      console.log(
        `\n[INSPECT] Found ${listSymbols.length} symbols named 'List'`,
      );
      listSymbols.forEach((s, idx) => {
        console.log(
          `[INSPECT]   List symbol ${idx}: fileUri=${s.fileUri}, kind=${s.kind}`,
        );
      });

      // Try to find List.cls symbol table using the fileUri from the symbol
      const listSymbol = listSymbols.find((s) =>
        s.fileUri?.includes('List.cls'),
      );
      const listFileUri =
        listSymbol?.fileUri ||
        'apexlib://resources/StandardApexLibrary/System/List.cls';
      console.log(
        `[INSPECT] Looking for List.cls symbol table at: ${listFileUri}`,
      );

      const listSymbolTable = (
        symbolManager as any
      ).symbolGraph.getSymbolTableForFile(listFileUri);

      if (listSymbolTable) {
        const allListSymbols = listSymbolTable.getAllSymbols();
        const sizeSymbols = allListSymbols.filter(
          (s: any) => s.name === 'size',
        );

        console.log('\n[INSPECT] List.cls symbol table:');
        console.log(`[INSPECT] Total symbols: ${allListSymbols.length}`);
        console.log(`[INSPECT] Symbols named 'size': ${sizeSymbols.length}`);
        sizeSymbols.forEach((s: any, idx: number) => {
          console.log(
            `[INSPECT]   size symbol ${idx}: kind=${s.kind}, id=${s.id}, parentId=${s.parentId}, fileUri=${s.fileUri}`,
          );
        });

        // Check all method symbols
        const methodSymbols = allListSymbols.filter(
          (s: any) => s.kind === 'method',
        );
        console.log(
          `[INSPECT] Method symbols in List.cls: ${methodSymbols.length}`,
        );
        methodSymbols.slice(0, 5).forEach((m: any) => {
          console.log(
            `[INSPECT]   Method: ${m.name} (id=${m.id}, parentId=${m.parentId})`,
          );
        });

        // Check all variable symbols
        const variableSymbols = allListSymbols.filter(
          (s: any) => s.kind === 'variable',
        );
        console.log(
          `[INSPECT] Variable symbols in List.cls: ${variableSymbols.length}`,
        );
        variableSymbols.slice(0, 5).forEach((v: any) => {
          console.log(
            `[INSPECT]   Variable: ${v.name} (id=${v.id}, parentId=${v.parentId})`,
          );
        });
      } else {
        console.log(
          `[INSPECT] List.cls symbol table not found at ${listFileUri}`,
        );
      }

      // Inspect TestListOperations.cls symbol table
      const testFileUri = 'file:///test/TestListOperations.cls';
      const testSymbolTable = (
        symbolManager as any
      ).symbolGraph.getSymbolTableForFile(testFileUri);

      if (testSymbolTable) {
        const allTestSymbols = testSymbolTable.getAllSymbols();
        const numbersSymbols = allTestSymbols.filter(
          (s: any) => s.name === 'numbers',
        );
        const sizeRefs = testSymbolTable
          .getAllReferences()
          .filter((r: any) => r.name === 'size');

        console.log('\n[INSPECT] TestListOperations.cls symbol table:');
        console.log(`[INSPECT] Total symbols: ${allTestSymbols.length}`);
        console.log(
          `[INSPECT] Symbols named 'numbers': ${numbersSymbols.length}`,
        );
        numbersSymbols.forEach((s: any, idx: number) => {
          console.log(
            `[INSPECT]   numbers symbol ${idx}: kind=${s.kind}, id=${s.id}, parentId=${s.parentId}`,
          );
          if (s.kind === 'variable' && (s as any).type) {
            const type = (s as any).type;
            console.log(
              `[INSPECT]     type: name=${type.name}, resolvedSymbol=${type.resolvedSymbol?.name || 'null'}`,
            );
          }
        });

        console.log(`[INSPECT] References named 'size': ${sizeRefs.length}`);
        sizeRefs.forEach((r: any, idx: number) => {
          console.log(
            `[INSPECT]   size reference ${idx}: context=${r.context}, location=${r.location.identifierRange.startLine}:${r.location.identifierRange.startColumn}`,
          );
          if (r.resolvedSymbolId) {
            const resolved = testSymbolTable.getSymbolById(r.resolvedSymbolId);
            console.log(
              `[INSPECT]     resolved to: ${resolved ? `${resolved.name} (${resolved.kind})` : 'null'}`,
            );
          }
        });
      } else {
        console.log('[INSPECT] TestListOperations.cls symbol table not found');
      }
    });

    it('should inspect symbol classification in String.cls', async () => {
      // Force String, Map, and Set to be loaded by resolving references to them
      const apexSource = `
        public class TestString {
          void test() {
            String s = 'hello';
            Integer len = s.length();
            Map<String, Integer> m = new Map<String, Integer>();
            Set<String> set = new Set<String>();
          }
        }
      `;

      const listener = new ApexSymbolCollectorListener(undefined, 'public-api');
      const result = compilerService.compile(
        apexSource,
        '/test/TestString.cls',
        listener,
      );

      if (result.result) {
        await Effect.runPromise(
          symbolManager.addSymbolTable(
            result.result,
            'file:///test/TestString.cls',
          ),
        );
      }

      // Force String, Map, and Set to be loaded by resolving references to them
      const lines = apexSource.split('\n');

      // Trigger String loading
      const stringDeclLine = 3; // Line 4: "String s = 'hello';"
      const stringDeclLineText = lines[stringDeclLine];
      const stringIndex = stringDeclLineText.indexOf('String');
      await symbolManager.getSymbolAtPosition(
        'file:///test/TestString.cls',
        {
          line: stringDeclLine + 1,
          character: stringIndex,
        },
        'precise',
      );

      // Trigger Map loading
      const mapDeclLine = 5; // Line 6: "Map<String, Integer> m = ..."
      const mapDeclLineText = lines[mapDeclLine];
      const mapIndex = mapDeclLineText.indexOf('Map');
      await symbolManager.getSymbolAtPosition(
        'file:///test/TestString.cls',
        {
          line: mapDeclLine + 1,
          character: mapIndex,
        },
        'precise',
      );

      // Trigger Set loading
      const setDeclLine = 6; // Line 7: "Set<String> set = ..."
      const setDeclLineText = lines[setDeclLine];
      const setIndex = setDeclLineText.indexOf('Set');
      await symbolManager.getSymbolAtPosition(
        'file:///test/TestString.cls',
        {
          line: setDeclLine + 1,
          character: setIndex,
        },
        'precise',
      );

      // Wait for all classes to be loaded
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Find String symbols to determine the correct file URI
      const stringSymbols = symbolManager.findSymbolByName('String');
      console.log(
        `\n[INSPECT] Found ${stringSymbols.length} symbols named 'String'`,
      );
      stringSymbols.forEach((s, idx) => {
        console.log(
          `[INSPECT]   String symbol ${idx}: fileUri=${s.fileUri}, kind=${s.kind}`,
        );
      });

      const stringSymbol = stringSymbols.find((s) =>
        s.fileUri?.includes('String.cls'),
      );
      const stringFileUri =
        stringSymbol?.fileUri ||
        'apexlib://resources/StandardApexLibrary/System/String.cls';

      console.log(
        `[INSPECT] Looking for String.cls symbol table at: ${stringFileUri}`,
      );
      const stringSymbolTable = (
        symbolManager as any
      ).symbolGraph.getSymbolTableForFile(stringFileUri);

      if (stringSymbolTable) {
        const allStringSymbols = stringSymbolTable.getAllSymbols();
        const lengthSymbols = allStringSymbols.filter(
          (s: any) => s.name === 'length',
        );
        const substringSymbols = allStringSymbols.filter(
          (s: any) => s.name === 'substring',
        );

        console.log('[INSPECT] String.cls symbol table:');
        console.log(`[INSPECT] Total symbols: ${allStringSymbols.length}`);
        console.log(
          `[INSPECT] Symbols named 'length': ${lengthSymbols.length}`,
        );
        lengthSymbols.forEach((s: any, idx: number) => {
          console.log(
            `[INSPECT]   length symbol ${idx}: kind=${s.kind}, id=${s.id}, parentId=${s.parentId}`,
          );
        });
        console.log(
          `[INSPECT] Symbols named 'substring': ${substringSymbols.length}`,
        );
        substringSymbols.slice(0, 2).forEach((s: any, idx: number) => {
          console.log(
            `[INSPECT]   substring symbol ${idx}: kind=${s.kind}, id=${s.id}`,
          );
        });

        // Check all method symbols
        const methodSymbols = allStringSymbols.filter(
          (s: any) => s.kind === 'method',
        );
        console.log(
          `[INSPECT] Method symbols in String.cls: ${methodSymbols.length}`,
        );

        // Check all variable symbols
        const variableSymbols = allStringSymbols.filter(
          (s: any) => s.kind === 'variable',
        );
        console.log(
          `[INSPECT] Variable symbols in String.cls: ${variableSymbols.length}`,
        );
        const methodNamesAsVariables = variableSymbols
          .filter((v: any) =>
            ['length', 'substring', 'toLowerCase', 'toUpperCase'].includes(
              v.name,
            ),
          )
          .slice(0, 5);
        methodNamesAsVariables.forEach((v: any) => {
          console.log(
            `[INSPECT]   Variable with method name: ${v.name} (id=${v.id})`,
          );
        });
      } else {
        console.log('[INSPECT] String.cls symbol table not found');
      }

      // Check Map and Set (both are generic classes like List)
      const mapSymbols = symbolManager.findSymbolByName('Map');
      const mapSymbol = mapSymbols.find((s) => s.fileUri?.includes('Map.cls'));
      if (mapSymbol) {
        const mapFileUri = mapSymbol.fileUri;
        const mapSymbolTable = (
          symbolManager as any
        ).symbolGraph.getSymbolTableForFile(mapFileUri);
        if (mapSymbolTable) {
          const allMapSymbols = mapSymbolTable.getAllSymbols();
          const mapMethodSymbols = allMapSymbols.filter(
            (s: any) => s.kind === 'method',
          );
          const mapVariableSymbols = allMapSymbols.filter(
            (s: any) => s.kind === 'variable',
          );
          console.log(
            `\n[INSPECT] Map.cls: Methods=${mapMethodSymbols.length}, Variables=${mapVariableSymbols.length}`,
          );
          if (mapVariableSymbols.length > 0) {
            const methodNamesAsVars = mapVariableSymbols
              .filter((v: any) =>
                ['clear', 'clone', 'containsKey', 'size'].includes(v.name),
              )
              .slice(0, 3);
            methodNamesAsVars.forEach((v: any) => {
              console.log(
                `[INSPECT]   Map variable with method name: ${v.name} (kind=${v.kind})`,
              );
            });
          }
        }
      }

      const setSymbols = symbolManager.findSymbolByName('Set');
      const setSymbol = setSymbols.find((s) => s.fileUri?.includes('Set.cls'));
      if (setSymbol) {
        const setFileUri = setSymbol.fileUri;
        const setSymbolTable = (
          symbolManager as any
        ).symbolGraph.getSymbolTableForFile(setFileUri);
        if (setSymbolTable) {
          const allSetSymbols = setSymbolTable.getAllSymbols();
          const setMethodSymbols = allSetSymbols.filter(
            (s: any) => s.kind === 'method',
          );
          const setVariableSymbols = allSetSymbols.filter(
            (s: any) => s.kind === 'variable',
          );
          console.log(
            `\n[INSPECT] Set.cls: Methods=${setMethodSymbols.length}, Variables=${setVariableSymbols.length}`,
          );
          if (setVariableSymbols.length > 0) {
            const methodNamesAsVars = setVariableSymbols
              .filter((v: any) => ['add', 'addAll', 'size'].includes(v.name))
              .slice(0, 3);
            methodNamesAsVars.forEach((v: any) => {
              console.log(
                `[INSPECT]   Set variable with method name: ${v.name} (kind=${v.kind})`,
              );
            });
          }
        }
      }
    });
  });
});
