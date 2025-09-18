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
      const foundSymbol = symbolManager.findSymbolByFQN('TestClass');
      expect(foundSymbol).toBeTruthy();
      expect(foundSymbol?.name).toBe('TestClass');
      expect(foundSymbol?.kind).toBe(SymbolKind.Class);
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
      const foundSymbol = symbolManager.findSymbolByFQN('TestClass.testMethod');
      expect(foundSymbol).toBeTruthy();
      expect(foundSymbol?.name).toBe('testMethod');
      expect(foundSymbol?.kind).toBe(SymbolKind.Method);
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
      const foundInnerClass = symbolManager.findSymbolByFQN(
        'TestClass.InnerClass',
      );
      expect(foundInnerClass).toBeTruthy();
      expect(foundInnerClass?.name).toBe('InnerClass');
      expect(foundInnerClass?.kind).toBe(SymbolKind.Class);

      // Verify FQNs can be looked up for inner method
      const foundMethod = symbolManager.findSymbolByFQN(
        'TestClass.InnerClass.innerMethod',
      );
      expect(foundMethod).toBeTruthy();
      expect(foundMethod?.name).toBe('innerMethod');
      expect(foundMethod?.kind).toBe(SymbolKind.Method);
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
      const foundSymbol = symbolManager.findSymbolByFQN('TestClass');
      expect(foundSymbol).toBeTruthy();
      expect(foundSymbol?.name).toBe('TestClass');
      expect(foundSymbol?.kind).toBe(SymbolKind.Class);
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
      const foundClass = symbolManager.findSymbolByFQN('TestClass');
      expect(foundClass).toBeTruthy();
      expect(foundClass?.name).toBe('TestClass');
      expect(foundClass?.kind).toBe(SymbolKind.Class);

      const foundMethod = symbolManager.findSymbolByFQN('TestClass.testMethod');
      expect(foundMethod).toBeTruthy();
      expect(foundMethod?.name).toBe('testMethod');
      expect(foundMethod?.kind).toBe(SymbolKind.Method);

      // Test interface FQN
      const foundInterface = symbolManager.findSymbolByFQN(
        'TestClass.TestInterface',
      );
      expect(foundInterface).toBeTruthy();
      expect(foundInterface?.name).toBe('TestInterface');
      expect(foundInterface?.kind).toBe(SymbolKind.Interface);

      // Test enum FQN
      const foundEnum = symbolManager.findSymbolByFQN('TestClass.TestEnum');
      expect(foundEnum).toBeTruthy();
      expect(foundEnum?.name).toBe('TestEnum');
      expect(foundEnum?.kind).toBe(SymbolKind.Enum);
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
      const fqnResult = symbolManager.findSymbolByFQN('TestClass.testMethod');
      expect(fqnResult).toBeTruthy();
      expect(fqnResult?.name).toBe('testMethod');
    });
  });
});
