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
import { initialize as schedulerInitialize, reset as schedulerReset } from '../../src/queue/priority-scheduler-utils';
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
    // Reset scheduler after all tests
    await Effect.runPromise(schedulerReset());
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

      // Find the class symbol
      const classSymbol = symbols.find((s) => s.name === 'TestClass');
      expect(classSymbol).toBeDefined();
      // FQN is normalized to lowercase for Apex case-insensitive convention
      expect(classSymbol?.fqn).toBe('testclass');

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
      const methodSymbol = symbols.find((s) => s.name === 'myMethod');
      expect(methodSymbol).toBeDefined();
      // FQN is normalized to lowercase for Apex case-insensitive convention
      expect(methodSymbol?.fqn).toBe('testclass.mymethod');

      // Verify FQN can be looked up (case-insensitive)
      const foundSymbol = symbolGraph.findSymbolByFQN('testclass.mymethod');
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
      const innerClass = symbols.find((s) => s.name === 'InnerClass');
      const methodSymbol = symbols.find((s) => s.name === 'innerMethod');

      expect(innerClass).toBeDefined();
      expect(methodSymbol).toBeDefined();
      // FQN is normalized to lowercase for Apex case-insensitive convention
      expect(innerClass?.fqn).toBe('outerclass.innerclass');
      expect(methodSymbol?.fqn).toBe('outerclass.innerclass.innermethod');

      // Verify FQNs can be looked up
      const foundInnerClass = symbolGraph.findSymbolByFQN(
        'OuterClass.InnerClass',
      );
      expect(foundInnerClass).toBeTruthy();
      expect(foundInnerClass?.name).toBe('InnerClass');

      const foundMethod = symbolGraph.findSymbolByFQN(
        'OuterClass.InnerClass.innerMethod',
      );
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

      // Find the class symbol
      const classSymbol = symbols.find((s) => s.name === 'TestClass');
      expect(classSymbol).toBeDefined();
      expect(classSymbol?.fqn).toBe('customnamespace.testclass');

      // Verify FQN can be looked up
      const foundSymbol = symbolGraph.findSymbolByFQN(
        'customnamespace.testclass',
      );
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

      // Verify both FQNs can be looked up
      const foundClass = symbolGraph.findSymbolByFQN('TestClass');
      expect(foundClass).toBeTruthy();
      expect(foundClass?.name).toBe('TestClass');

      const foundMethod = symbolGraph.findSymbolByFQN('TestClass.myMethod');
      expect(foundMethod).toBeTruthy();
      expect(foundMethod?.name).toBe('myMethod');
    });
  });
});
