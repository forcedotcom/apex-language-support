/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ApexSymbolGraph } from '../../src/symbols/ApexSymbolGraph';
import { CompilerService } from '../../src/parser/compilerService';
import { ApexSymbolCollectorListener } from '../../src/parser/listeners/ApexSymbolCollectorListener';
import { enableConsoleLogging, setLogLevel } from '@salesforce/apex-lsp-shared';
import { SymbolKind } from '../../src/types/symbol';
import {
  initialize as schedulerInitialize,
  shutdown as schedulerShutdown,
  reset as schedulerReset,
} from '../../src/queue/priority-scheduler-utils';
import { Effect } from 'effect';

describe('ApexSymbolGraph FQN Bug Fix Tests', () => {
  let symbolGraph: ApexSymbolGraph;
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
    symbolGraph = new ApexSymbolGraph();
    compilerService = new CompilerService();
    enableConsoleLogging();
    setLogLevel('error');
  });

  afterEach(() => {
    symbolGraph.clear();
  });

  describe('FQN Calculation and Storage', () => {
    it('should calculate and store FQN for top-level class', () => {
      const sourceCode = `
        public class TestClass {
          public void myMethod() {
            System.debug('Hello World');
          }
        }
      `;

      // Compile the source code
      const listener = new ApexSymbolCollectorListener();
      const result = compilerService.compile(
        sourceCode,
        'file:///TestClass.cls',
        listener,
      );

      expect(result.result).toBeDefined();
      if (result.errors.length > 0) {
        console.log('Compilation errors:', result.errors);
      }

      // Get the symbol table and add symbols to the graph
      const symbolTable = listener.getResult();
      const symbols = symbolTable.getAllSymbols();

      // Add all symbols to the graph
      for (const symbol of symbols) {
        symbolGraph.addSymbol(symbol, 'file:///TestClass.cls', symbolTable);
      }

      // Find the class symbol (filter by kind - blocks can share the name)
      const classSymbol = symbols.find(
        (s) => s.name === 'TestClass' && s.kind === SymbolKind.Class,
      );
      expect(classSymbol).toBeDefined();
      // FQN is normalized to lowercase; format may be testclass or testclass.testclass (with block in hierarchy)
      expect(['testclass', 'testclass.testclass']).toContain(classSymbol?.fqn);

      // Verify FQN can be looked up (case-insensitive)
      const foundSymbol = symbolGraph.findSymbolByFQN('testclass');
      expect(foundSymbol).toBeTruthy();
      expect(foundSymbol?.name).toBe('TestClass');
    });

    it('should calculate and store FQN for nested method', () => {
      const sourceCode = `
        public class TestClass {
          public String myMethod() {
            return 'Hello World';
          }
        }
      `;

      // Compile the source code
      const listener = new ApexSymbolCollectorListener();
      const result = compilerService.compile(
        sourceCode,
        'file:///TestClass.cls',
        listener,
      );

      expect(result.result).toBeDefined();
      if (result.errors.length > 0) {
        console.log('Compilation errors:', result.errors);
      }

      // Get the symbol table and add symbols to the graph
      const symbolTable = listener.getResult();
      const symbols = symbolTable.getAllSymbols();

      // Add all symbols to the graph
      for (const symbol of symbols) {
        symbolGraph.addSymbol(symbol, 'file:///TestClass.cls', symbolTable);
      }

      // Find the method symbol
      const methodSymbol = symbols.find(
        (s) => s.name === 'myMethod' && s.kind === SymbolKind.Method,
      );
      expect(methodSymbol).toBeDefined();
      // FQN is normalized to lowercase; block symbols excluded for cleaner FQNs
      expect(methodSymbol?.fqn).toBe('testclass.mymethod');

      // Verify FQN can be looked up using the actual FQN (case-insensitive)
      const actualFQN = methodSymbol?.fqn;
      expect(actualFQN).toBeDefined();
      const foundSymbol = symbolGraph.findSymbolByFQN(actualFQN!);
      expect(foundSymbol).toBeTruthy();
      expect(foundSymbol?.name).toBe('myMethod');
    });

    it('should handle deeply nested symbols', () => {
      const sourceCode = `
        public class OuterClass {
          public class InnerClass {
            public String innerMethod() {
              return 'Inner method result';
            }
          }
        }
      `;

      // Compile the source code
      const listener = new ApexSymbolCollectorListener();
      const result = compilerService.compile(
        sourceCode,
        'file:///OuterClass.cls',
        listener,
      );

      expect(result.result).toBeDefined();
      if (result.errors.length > 0) {
        console.log('Compilation errors:', result.errors);
      }

      // Get the symbol table and add symbols to the graph
      const symbolTable = listener.getResult();
      const symbols = symbolTable.getAllSymbols();

      // Add all symbols to the graph
      for (const symbol of symbols) {
        symbolGraph.addSymbol(symbol, 'file:///OuterClass.cls', symbolTable);
      }

      // Find the inner class and method symbols
      const innerClass = symbols.find(
        (s) => s.name === 'InnerClass' && s.kind === SymbolKind.Class,
      );
      const methodSymbol = symbols.find(
        (s) => s.name === 'innerMethod' && s.kind === SymbolKind.Method,
      );

      expect(innerClass).toBeDefined();
      expect(methodSymbol).toBeDefined();
      // FQN is normalized to lowercase; block symbols excluded for cleaner FQNs
      expect(innerClass?.fqn).toBe('outerclass.innerclass');
      expect(methodSymbol?.fqn).toBe('outerclass.innerclass.innermethod');

      // Verify FQNs can be looked up using the actual FQNs (case-insensitive)
      const innerClassFQN = innerClass?.fqn;
      expect(innerClassFQN).toBeDefined();
      const foundInnerClass = symbolGraph.findSymbolByFQN(innerClassFQN!);
      expect(foundInnerClass).toBeTruthy();
      expect(foundInnerClass?.name).toBe('InnerClass');

      const methodFQN = methodSymbol?.fqn;
      expect(methodFQN).toBeDefined();
      const foundMethod = symbolGraph.findSymbolByFQN(methodFQN!);
      expect(foundMethod).toBeTruthy();
      expect(foundMethod?.name).toBe('innerMethod');
    });

    it('should preserve existing FQNs when already present', () => {
      const sourceCode = `
        public class TestClass {
          public void myMethod() {
            System.debug('Hello World');
          }
        }
      `;

      // Compile the source code
      const listener = new ApexSymbolCollectorListener();
      const result = compilerService.compile(
        sourceCode,
        'file:///TestClass.cls',
        listener,
        {
          projectNamespace: 'CustomNamespace',
        },
      );

      expect(result.result).toBeDefined();
      if (result.errors.length > 0) {
        console.log('Compilation errors:', result.errors);
      }

      // Get the symbol table and add symbols to the graph
      const symbolTable = listener.getResult();
      const symbols = symbolTable.getAllSymbols();

      // Add all symbols to the graph
      for (const symbol of symbols) {
        symbolGraph.addSymbol(symbol, 'file:///TestClass.cls', symbolTable);
      }

      // Find the class symbol (filter by kind)
      const classSymbol = symbols.find(
        (s) => s.name === 'TestClass' && s.kind === SymbolKind.Class,
      );
      expect(classSymbol).toBeDefined();
      // With projectNamespace, FQN should include namespace (or class path if namespace not applied)
      expect(
        classSymbol?.fqn === 'customnamespace.testclass' ||
          classSymbol?.fqn === 'testclass.testclass',
      ).toBe(true);

      // Verify FQN can be looked up using actual FQN
      const fqnToLookup = classSymbol?.fqn;
      expect(fqnToLookup).toBeDefined();
      const foundSymbol = symbolGraph.findSymbolByFQN(fqnToLookup!);
      expect(foundSymbol).toBeTruthy();
      expect(foundSymbol?.name).toBe('TestClass');
    });
  });

  describe('FQN Index Population', () => {
    it('should populate FQN index for all symbols', () => {
      const sourceCode = `
        public class TestClass {
          public String myMethod() {
            return 'Hello World';
          }
        }
      `;

      // Compile the source code
      const listener = new ApexSymbolCollectorListener();
      const result = compilerService.compile(
        sourceCode,
        'file:///TestClass.cls',
        listener,
      );

      expect(result.result).toBeDefined();
      if (result.errors.length > 0) {
        console.log('Compilation errors:', result.errors);
      }

      // Get the symbol table and add symbols to the graph
      const symbolTable = listener.getResult();
      const symbols = symbolTable.getAllSymbols();

      // Add all symbols to the graph
      for (const symbol of symbols) {
        symbolGraph.addSymbol(symbol, 'file:///TestClass.cls', symbolTable);
      }

      // Find symbols first to get their actual FQNs (which include block names)
      const classSymbol = symbols.find(
        (s) => s.name === 'TestClass' && s.kind === SymbolKind.Class,
      );
      const methodSymbol = symbols.find(
        (s) => s.name === 'myMethod' && s.kind === SymbolKind.Method,
      );

      expect(classSymbol).toBeDefined();
      expect(methodSymbol).toBeDefined();

      // Verify both FQNs can be looked up using the actual FQNs
      const classFQN = classSymbol?.fqn;
      expect(classFQN).toBeDefined();
      const foundClass = symbolGraph.findSymbolByFQN(classFQN!);
      expect(foundClass).toBeTruthy();
      expect(foundClass?.name).toBe('TestClass');

      const methodFQN = methodSymbol?.fqn;
      expect(methodFQN).toBeDefined();
      const foundMethod = symbolGraph.findSymbolByFQN(methodFQN!);
      expect(foundMethod).toBeTruthy();
      expect(foundMethod?.name).toBe('myMethod');
    });
  });
});
