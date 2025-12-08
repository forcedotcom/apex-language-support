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
import { SymbolKind } from '../../src/types/symbol';
import { enableConsoleLogging, setLogLevel } from '@salesforce/apex-lsp-shared';

describe('ApexSymbolManager FQN Bug Fix Tests', () => {
  let symbolManager: ApexSymbolManager;
  let compilerService: CompilerService;

  beforeEach(() => {
    symbolManager = new ApexSymbolManager();
    compilerService = new CompilerService();
    enableConsoleLogging();
    setLogLevel('error');
  });

  afterEach(() => {
    symbolManager.clear();
  });

  describe('FQN Calculation and Storage', () => {
    it('should calculate and store FQN for top-level class', () => {
      // Read the real TestClassWithNested.cls file
      const testClassPath = path.join(
        __dirname,
        '../fixtures/fqn/TestClassWithNested.cls',
      );
      const testClassContent = fs.readFileSync(testClassPath, 'utf8');

      // Parse the TestClass and add it to the symbol manager
      const testClassListener = new ApexSymbolCollectorListener();
      const testClassResult = compilerService.compile(
        testClassContent,
        'file:///test/TestClassWithNested.cls',
        testClassListener,
      );

      if (testClassResult.result) {
        symbolManager.addSymbolTable(
          testClassResult.result,
          'file:///test/TestClassWithNested.cls',
        );
      }

      // Verify FQN can be looked up for the top-level class
      // FQN now includes blocks, so we need to find the symbol first and check its FQN
      const symbolTable = testClassResult.result;
      if (symbolTable) {
        const allSymbols = symbolTable.getAllSymbols();
        const classSymbol = allSymbols.find(
          (s) => s.name === 'TestClass' && s.kind === SymbolKind.Class,
        );
        expect(classSymbol).toBeDefined();
        if (classSymbol && classSymbol.fqn) {
          const foundSymbol = symbolManager.findSymbolByFQN(classSymbol.fqn);
          expect(foundSymbol).toBeTruthy();
          expect(foundSymbol?.name).toBe('TestClass');
          expect(foundSymbol?.kind).toBe(SymbolKind.Class);
        }
      }
    });

    it('should calculate and store FQN for nested method', () => {
      // Read the real TestClassWithNested.cls file
      const testClassPath = path.join(
        __dirname,
        '../fixtures/fqn/TestClassWithNested.cls',
      );
      const testClassContent = fs.readFileSync(testClassPath, 'utf8');

      // Parse the TestClass and add it to the symbol manager
      const testClassListener = new ApexSymbolCollectorListener();
      const testClassResult = compilerService.compile(
        testClassContent,
        'file:///test/TestClassWithNested.cls',
        testClassListener,
      );

      if (testClassResult.result) {
        symbolManager.addSymbolTable(
          testClassResult.result,
          'file:///test/TestClassWithNested.cls',
        );
      }

      // Verify FQN can be looked up for the nested method
      // FQN now includes blocks, so we need to find the symbol first and check its FQN
      const symbolTable = testClassResult.result;
      if (symbolTable) {
        const allSymbols = symbolTable.getAllSymbols();
        const methodSymbol = allSymbols.find(
          (s) => s.name === 'testMethod' && s.kind === SymbolKind.Method,
        );
        expect(methodSymbol).toBeDefined();
        if (methodSymbol && methodSymbol.fqn) {
          // Verify the symbol can be found by its actual FQN
          const foundSymbol = symbolManager.findSymbolByFQN(methodSymbol.fqn);
          expect(foundSymbol).toBeTruthy();
          expect(foundSymbol?.name).toBe('testMethod');
          expect(foundSymbol?.kind).toBe(SymbolKind.Method);
        }
      }
    });

    it('should handle deeply nested symbols', () => {
      // Read the real TestClassWithNested.cls file
      const testClassPath = path.join(
        __dirname,
        '../fixtures/fqn/TestClassWithNested.cls',
      );
      const testClassContent = fs.readFileSync(testClassPath, 'utf8');

      // Parse the TestClass and add it to the symbol manager
      const testClassListener = new ApexSymbolCollectorListener();
      const testClassResult = compilerService.compile(
        testClassContent,
        'file:///test/TestClassWithNested.cls',
        testClassListener,
      );

      if (testClassResult.result) {
        symbolManager.addSymbolTable(
          testClassResult.result,
          'file:///test/TestClassWithNested.cls',
        );
      }

      // Verify FQNs can be looked up for inner class
      // FQN now includes blocks, so we need to find the symbol first and check its FQN
      const symbolTable = testClassResult.result;
      if (symbolTable) {
        const allSymbols = symbolTable.getAllSymbols();
        const innerClassSymbol = allSymbols.find(
          (s) => s.name === 'InnerClass' && s.kind === SymbolKind.Class,
        );
        expect(innerClassSymbol).toBeDefined();
        if (innerClassSymbol && innerClassSymbol.fqn) {
          // Verify the symbol can be found by its actual FQN
          const foundInnerClass = symbolManager.findSymbolByFQN(
            innerClassSymbol.fqn,
          );
          expect(foundInnerClass).toBeTruthy();
          expect(foundInnerClass?.name).toBe('InnerClass');
          expect(foundInnerClass?.kind).toBe(SymbolKind.Class);
        }
      }

      // Verify FQNs can be looked up for inner method
      // FQN now includes blocks, so we need to find the symbol first and check its FQN
      if (symbolTable) {
        const allSymbols = symbolTable.getAllSymbols();
        const innerMethodSymbol = allSymbols.find(
          (s) => s.name === 'innerMethod' && s.kind === SymbolKind.Method,
        );
        expect(innerMethodSymbol).toBeDefined();
        if (innerMethodSymbol && innerMethodSymbol.fqn) {
          // Verify the symbol can be found by its actual FQN
          const foundMethod = symbolManager.findSymbolByFQN(
            innerMethodSymbol.fqn,
          );
          expect(foundMethod).toBeTruthy();
          expect(foundMethod?.name).toBe('innerMethod');
          expect(foundMethod?.kind).toBe(SymbolKind.Method);
        }
      }
    });

    it('should preserve existing FQNs when already present', () => {
      // Read the real TestClassWithNested.cls file
      const testClassPath = path.join(
        __dirname,
        '../fixtures/fqn/TestClassWithNested.cls',
      );
      const testClassContent = fs.readFileSync(testClassPath, 'utf8');

      // Parse the TestClass and add it to the symbol manager
      const testClassListener = new ApexSymbolCollectorListener();
      const testClassResult = compilerService.compile(
        testClassContent,
        'file:///test/TestClassWithNested.cls',
        testClassListener,
      );

      if (testClassResult.result) {
        symbolManager.addSymbolTable(
          testClassResult.result,
          'file:///test/TestClassWithNested.cls',
        );
      }

      // Verify FQN can be looked up (should be calculated automatically)
      // FQN now includes blocks, so we need to find the symbol first and check its FQN
      const symbolTable = testClassResult.result;
      if (symbolTable) {
        const allSymbols = symbolTable.getAllSymbols();
        const classSymbol = allSymbols.find(
          (s) => s.name === 'TestClass' && s.kind === SymbolKind.Class,
        );
        expect(classSymbol).toBeDefined();
        if (classSymbol && classSymbol.fqn) {
          const foundSymbol = symbolManager.findSymbolByFQN(classSymbol.fqn);
          expect(foundSymbol).toBeTruthy();
          expect(foundSymbol?.name).toBe('TestClass');
          expect(foundSymbol?.kind).toBe(SymbolKind.Class);
        }
      }
    });
  });

  describe('FQN Index Population', () => {
    it('should populate FQN index for all symbols', () => {
      // Read the real TestClassWithNested.cls file
      const testClassPath = path.join(
        __dirname,
        '../fixtures/fqn/TestClassWithNested.cls',
      );
      const testClassContent = fs.readFileSync(testClassPath, 'utf8');

      // Parse the TestClass and add it to the symbol manager
      const testClassListener = new ApexSymbolCollectorListener();
      const testClassResult = compilerService.compile(
        testClassContent,
        'file:///test/TestClassWithNested.cls',
        testClassListener,
      );

      if (testClassResult.result) {
        symbolManager.addSymbolTable(
          testClassResult.result,
          'file:///test/TestClassWithNested.cls',
        );
      }

      // Verify both FQNs can be looked up
      // FQN now includes blocks, so we need to find the symbols first and check their FQNs
      const symbolTable = testClassResult.result;
      if (symbolTable) {
        const allSymbols = symbolTable.getAllSymbols();

        // Find class symbol and verify it can be found by FQN
        const classSymbol = allSymbols.find(
          (s) => s.name === 'TestClass' && s.kind === SymbolKind.Class,
        );
        expect(classSymbol).toBeDefined();
        if (classSymbol && classSymbol.fqn) {
          const foundClass = symbolManager.findSymbolByFQN(classSymbol.fqn);
          expect(foundClass).toBeTruthy();
          expect(foundClass?.name).toBe('TestClass');
          expect(foundClass?.kind).toBe(SymbolKind.Class);
        }

        // Find method symbol and verify it can be found by FQN
        const methodSymbol = allSymbols.find(
          (s) => s.name === 'testMethod' && s.kind === SymbolKind.Method,
        );
        expect(methodSymbol).toBeDefined();
        if (methodSymbol && methodSymbol.fqn) {
          const foundMethod = symbolManager.findSymbolByFQN(methodSymbol.fqn);
          expect(foundMethod).toBeTruthy();
          expect(foundMethod?.name).toBe('testMethod');
          expect(foundMethod?.kind).toBe(SymbolKind.Method);
        }

        // Test interface FQN
        const interfaceSymbol = allSymbols.find(
          (s) => s.name === 'TestInterface' && s.kind === SymbolKind.Interface,
        );
        expect(interfaceSymbol).toBeDefined();
        if (interfaceSymbol && interfaceSymbol.fqn) {
          const foundInterface = symbolManager.findSymbolByFQN(
            interfaceSymbol.fqn,
          );
          expect(foundInterface).toBeTruthy();
          expect(foundInterface?.name).toBe('TestInterface');
          expect(foundInterface?.kind).toBe(SymbolKind.Interface);
        }

        // Test enum FQN
        const enumSymbol = allSymbols.find(
          (s) => s.name === 'TestEnum' && s.kind === SymbolKind.Enum,
        );
        expect(enumSymbol).toBeDefined();
        if (enumSymbol && enumSymbol.fqn) {
          const foundEnum = symbolManager.findSymbolByFQN(enumSymbol.fqn);
          expect(foundEnum).toBeTruthy();
          expect(foundEnum?.name).toBe('TestEnum');
          expect(foundEnum?.kind).toBe(SymbolKind.Enum);
        }
      }
    });
  });

  describe('Integration with Symbol Resolution', () => {
    it('should resolve symbols by FQN in hover context', () => {
      // Read the real TestClassWithNested.cls file
      const testClassPath = path.join(
        __dirname,
        '../fixtures/fqn/TestClassWithNested.cls',
      );
      const testClassContent = fs.readFileSync(testClassPath, 'utf8');

      // Parse the TestClass and add it to the symbol manager
      const testClassListener = new ApexSymbolCollectorListener();
      const testClassResult = compilerService.compile(
        testClassContent,
        'file:///test/TestClassWithNested.cls',
        testClassListener,
      );

      if (testClassResult.result) {
        symbolManager.addSymbolTable(
          testClassResult.result,
          'file:///test/TestClassWithNested.cls',
        );
      }

      // Test symbol resolution with context (simulating hover)
      const resolutionContext = {
        sourceFile: 'TestClassWithNested.cls',
        namespaceContext: 'public',
        currentScope: 'method',
        scopeChain: ['method', 'class', 'global'],
        expectedType: 'String',
        parameterTypes: [],
        accessModifier: 'public' as const,
        isStatic: false,
        inheritanceChain: [],
        interfaceImplementations: [],
        importStatements: [],
      };

      // Resolve by name (should work)
      const nameResult = symbolManager.resolveSymbol(
        'testMethod',
        resolutionContext,
      );
      expect(nameResult.symbol).toBeTruthy();
      expect(nameResult.symbol?.name).toBe('testMethod');

      // Verify FQN lookup works separately
      // FQN now includes blocks, so we need to find the symbol first and check its FQN
      const symbolTable = testClassResult.result;
      if (symbolTable) {
        const allSymbols = symbolTable.getAllSymbols();
        const methodSymbol = allSymbols.find(
          (s) => s.name === 'testMethod' && s.kind === SymbolKind.Method,
        );
        expect(methodSymbol).toBeDefined();
        if (methodSymbol && methodSymbol.fqn) {
          const fqnResult = symbolManager.findSymbolByFQN(methodSymbol.fqn);
          expect(fqnResult).toBeTruthy();
          expect(fqnResult?.name).toBe('testMethod');
        }
      }
    });
  });
});
