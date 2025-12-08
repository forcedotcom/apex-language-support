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
  });

  afterAll(async () => {
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
  });

  beforeEach(() => {
    // Enable console logging with debug level for tests
    enableConsoleLogging();
    setLogLevel('error');

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
      const listener = new ApexSymbolCollectorListener();
      const result = compilerService.compile(
        apexSource,
        '/test/TestClass.cls',
        listener,
      );

      if (result.result) {
        symbolManager.addSymbolTable(
          result.result,
          'file:///test/TestClass.cls',
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
      const listener = new ApexSymbolCollectorListener();
      const result = compilerService.compile(
        apexSource,
        '/test/TestClassWithField.cls',
        listener,
      );

      if (result.result) {
        symbolManager.addSymbolTable(
          result.result,
          'file:///test/TestClassWithField.cls',
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
      const listener = new ApexSymbolCollectorListener();
      const result = compilerService.compile(
        apexSource,
        '/test/TestClassSimple.cls',
        listener,
      );

      if (result.result) {
        symbolManager.addSymbolTable(
          result.result,
          'file:///test/TestClassSimple.cls',
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
      const listener = new ApexSymbolCollectorListener();
      const result = compilerService.compile(
        apexSource,
        '/test/TestClassWithVariable.cls',
        listener,
      );

      if (result.result) {
        symbolManager.addSymbolTable(
          result.result,
          'file:///test/TestClassWithVariable.cls',
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
      const listener = new ApexSymbolCollectorListener();
      const result = compilerService.compile(
        apexSource,
        '/test/TestClassOverlapping.cls',
        listener,
      );

      if (result.result) {
        symbolManager.addSymbolTable(
          result.result,
          'file:///test/TestClassOverlapping.cls',
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

      const listener = new ApexSymbolCollectorListener();
      const result = compilerService.compile(
        apexSource,
        'file:///ScopeExample.cls',
        listener,
      );

      if (result.result) {
        symbolManager.addSymbolTable(result.result, 'file:///ScopeExample.cls');
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

      const listener = new ApexSymbolCollectorListener();
      const result = compilerService.compile(
        apexSource,
        'file:///ScopeExample.cls',
        listener,
      );

      if (result.result) {
        symbolManager.addSymbolTable(result.result, 'file:///ScopeExample.cls');
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

      const listener = new ApexSymbolCollectorListener();
      const result = compilerService.compile(
        apexSource,
        'file:///ScopeExample.cls',
        listener,
      );

      if (result.result) {
        symbolManager.addSymbolTable(result.result, 'file:///ScopeExample.cls');
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

      const listener = new ApexSymbolCollectorListener();
      const result = compilerService.compile(
        apexSource,
        'file:///ScopeExample.cls',
        listener,
      );

      if (result.result) {
        symbolManager.addSymbolTable(result.result, 'file:///ScopeExample.cls');
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
});
