/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ApexSymbolManager } from '../../src/symbols/ApexSymbolManager';
import { CompilerService } from '../../src/parser/compilerService';
import { ApexSymbolCollectorListener } from '../../src/parser/listeners/ApexSymbolCollectorListener';
import {
  initialize as schedulerInitialize,
  shutdown as schedulerShutdown,
  reset as schedulerReset,
} from '../../src/queue/priority-scheduler-utils';
import { Effect } from 'effect';
import { SymbolKind } from '../../src/types/symbol';
import { ApexSymbolGraph } from '../../src/symbols/ApexSymbolGraph';

describe('ApexSymbolManager SymbolTable-Based Resolution', () => {
  let symbolManager: ApexSymbolManager;

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
    symbolManager = new ApexSymbolManager();
  });

  afterEach(() => {
    if (symbolManager) {
      symbolManager.clear();
    }
  });

  describe('Same-File Reference Resolution (Set A)', () => {
    it('should resolve same-file references directly from SymbolTable without deferring', async () => {
      const sourceCode = `
        public class TestClass {
          public String field1 = 'value';
          
          public void method1() {
            String localVar = field1; // Reference to field1
            method2(); // Reference to method2
          }
          
          public void method2() {
            // Method implementation
          }
        }
      `;

      const listener = new ApexSymbolCollectorListener();
      const compilerService = new CompilerService();
      const result = compilerService.compile(
        sourceCode,
        'file:///TestClass.cls',
        listener,
      );

      expect(result.result).toBeDefined();
      const symbolTable = result.result!;

      // Add the symbol table to the manager
      await symbolManager.addSymbolTable(symbolTable, 'file:///TestClass.cls');

      // Wait for reference processing to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify that references were processed directly (not deferred)
      const allReferences = symbolTable.getAllReferences();
      expect(allReferences.length).toBeGreaterThan(0);

      // Find the method1 symbol
      const method1Symbols = symbolManager.findSymbolByName('method1');
      const method1 = method1Symbols.find((s) => s.kind === SymbolKind.Method);
      expect(method1).toBeDefined();

      if (method1) {
        // Check that references from method1 were added to the graph
        const referencesFrom = symbolManager.findReferencesFrom(method1);
        expect(referencesFrom.length).toBeGreaterThan(0);

        // Should have reference to field1
        const field1Ref = referencesFrom.find(
          (ref) => ref.symbol.name === 'field1',
        );
        expect(field1Ref).toBeDefined();

        // Should have reference to method2
        const method2Ref = referencesFrom.find(
          (ref) => ref.symbol.name === 'method2',
        );
        expect(method2Ref).toBeDefined();
      }

      // Verify stats show references were processed
      const stats = symbolManager.getStats();
      expect(stats.totalReferences).toBeGreaterThan(0);
    });

    it('should resolve block symbols to containing method/class from SymbolTable', async () => {
      const sourceCode = `
        public class TestClass {
          public String field1 = 'value';
          
          public void method1() {
            if (true) {
              // Block 1
              String localVar = field1; // Reference from inside block
              if (true) {
                // Block 2 (nested)
                method2(); // Reference from nested block
              }
            }
          }
          
          public void method2() {
            // Method implementation
          }
        }
      `;

      const listener = new ApexSymbolCollectorListener();
      const compilerService = new CompilerService();
      const result = compilerService.compile(
        sourceCode,
        'file:///TestClass.cls',
        listener,
      );

      expect(result.result).toBeDefined();
      const symbolTable = result.result!;

      // Add the symbol table to the manager
      await symbolManager.addSymbolTable(symbolTable, 'file:///TestClass.cls');

      // Wait for reference processing to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Find the method1 symbol
      const method1Symbols = symbolManager.findSymbolByName('method1');
      const method1 = method1Symbols.find((s) => s.kind === SymbolKind.Method);
      expect(method1).toBeDefined();

      if (method1) {
        // References from inside blocks should be attributed to method1 (not blocks)
        const referencesFrom = symbolManager.findReferencesFrom(method1);
        expect(referencesFrom.length).toBeGreaterThan(0);

        // Should have reference to field1 (from inside block)
        const field1Ref = referencesFrom.find(
          (ref) => ref.symbol.name === 'field1',
        );
        expect(field1Ref).toBeDefined();

        // Should have reference to method2 (from nested block)
        const method2Ref = referencesFrom.find(
          (ref) => ref.symbol.name === 'method2',
        );
        expect(method2Ref).toBeDefined();
      }

      // Verify no block symbols are used as source symbols in deferred references
      // (This would indicate the optimization isn't working)
      // Note: We access private properties for testing - these casts bypass TypeScript's
      // access control to verify internal implementation details
      const graph = (symbolManager as any).symbolGraph as ApexSymbolGraph;
      const deferredRefs = (graph as any).deferredReferences;

      // If there are deferred references, none should have block symbols as source
      if (deferredRefs && deferredRefs.size > 0) {
        for (const refs of deferredRefs.values()) {
          for (const ref of refs) {
            // Source symbols should be semantic symbols (method, class, etc.), not blocks
            expect(ref.sourceSymbol.kind).not.toBe(SymbolKind.Block);
            expect(
              ref.sourceSymbol.kind === SymbolKind.Method ||
                ref.sourceSymbol.kind === SymbolKind.Class ||
                ref.sourceSymbol.kind === SymbolKind.Interface ||
                ref.sourceSymbol.kind === SymbolKind.Enum ||
                ref.sourceSymbol.kind === SymbolKind.Trigger,
            ).toBe(true);
          }
        }
      }

      // Also verify that same-file references were added directly to the graph
      // (not deferred) by checking that referencesFrom returns results
      if (method1) {
        const referencesFrom = symbolManager.findReferencesFrom(method1);
        expect(referencesFrom.length).toBeGreaterThan(0);

        // These references should be in the graph, not deferred
        const field1Ref = referencesFrom.find(
          (ref) => ref.symbol.name === 'field1',
        );
        const method2Ref = referencesFrom.find(
          (ref) => ref.symbol.name === 'method2',
        );

        expect(field1Ref).toBeDefined();
        expect(method2Ref).toBeDefined();
      }
    });

    it('should handle references in nested blocks correctly', async () => {
      const sourceCode = `
        public class TestClass {
          public String field1 = 'value';
          
          public void method1() {
            if (true) {
              // Outer block
              String var1 = field1;
              for (Integer i = 0; i < 10; i++) {
                // Inner block (for loop)
                String var2 = field1;
                method2();
              }
            }
          }
          
          public void method2() {
            // Method implementation
          }
        }
      `;

      const listener = new ApexSymbolCollectorListener();
      const compilerService = new CompilerService();
      const result = compilerService.compile(
        sourceCode,
        'file:///TestClass.cls',
        listener,
      );

      expect(result.result).toBeDefined();
      const symbolTable = result.result!;

      // Add the symbol table to the manager
      await symbolManager.addSymbolTable(symbolTable, 'file:///TestClass.cls');

      // Wait for reference processing to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Find the method1 symbol
      const method1Symbols = symbolManager.findSymbolByName('method1');
      const method1 = method1Symbols.find((s) => s.kind === SymbolKind.Method);
      expect(method1).toBeDefined();

      if (method1) {
        const referencesFrom = symbolManager.findReferencesFrom(method1);

        // Should have references to field1 (from both blocks)
        const field1Refs = referencesFrom.filter(
          (ref) => ref.symbol.name === 'field1',
        );
        expect(field1Refs.length).toBeGreaterThan(0);

        // Should have reference to method2 (from inner block)
        const method2Ref = referencesFrom.find(
          (ref) => ref.symbol.name === 'method2',
        );
        expect(method2Ref).toBeDefined();
      }
    });

    it('should resolve references at class level (not in any method)', async () => {
      const sourceCode = `
        public class TestClass {
          public String field1 = 'value';
          public String field2 = field1; // Reference at class level
          
          public void method1() {
            // Method implementation
          }
        }
      `;

      const listener = new ApexSymbolCollectorListener();
      const compilerService = new CompilerService();
      const result = compilerService.compile(
        sourceCode,
        'file:///TestClass.cls',
        listener,
      );

      expect(result.result).toBeDefined();
      const symbolTable = result.result!;

      // Add the symbol table to the manager
      await symbolManager.addSymbolTable(symbolTable, 'file:///TestClass.cls');

      // Wait for reference processing to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Find the TestClass symbol
      const classSymbols = symbolManager.findSymbolByName('TestClass');
      const testClass = classSymbols.find((s) => s.kind === SymbolKind.Class);
      expect(testClass).toBeDefined();

      if (testClass) {
        // References at class level should be attributed to the class
        const referencesFrom = symbolManager.findReferencesFrom(testClass);

        // Should have reference to field1 (from field2 initialization)
        const field1Ref = referencesFrom.find(
          (ref) => ref.symbol.name === 'field1',
        );
        expect(field1Ref).toBeDefined();
      }
    });
  });

  describe('Cross-File Reference Handling (Set B)', () => {
    it('should defer cross-file references correctly', async () => {
      const sourceCode = `
        public class TestClass {
          public void method1() {
            Account acc = new Account(); // Cross-file reference to Account
            System.debug('test'); // Cross-file reference to System
          }
        }
      `;

      const listener = new ApexSymbolCollectorListener();
      const compilerService = new CompilerService();
      const result = compilerService.compile(
        sourceCode,
        'file:///TestClass.cls',
        listener,
      );

      expect(result.result).toBeDefined();
      const symbolTable = result.result!;

      // Add the symbol table to the manager
      await symbolManager.addSymbolTable(symbolTable, 'file:///TestClass.cls');

      // Wait for reference processing to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify that cross-file references were deferred
      // Note: We access private properties for testing - these casts bypass TypeScript's
      // access control to verify internal implementation details
      const graph = (symbolManager as any).symbolGraph as ApexSymbolGraph;
      const deferredRefs = (graph as any).deferredReferences;

      // Should have deferred references for Account and System
      expect(deferredRefs).toBeDefined();
      expect(deferredRefs.size).toBeGreaterThan(0);

      // Check that Account references are deferred
      const accountDeferred = deferredRefs.get('Account');
      expect(accountDeferred).toBeDefined();
      expect(accountDeferred!.length).toBeGreaterThan(0);

      // Check that System references are deferred
      const systemDeferred = deferredRefs.get('System');
      expect(systemDeferred).toBeDefined();
      expect(systemDeferred!.length).toBeGreaterThan(0);
    });

    it('should not defer same-file references even when they appear qualified', async () => {
      const sourceCode = `
        public class TestClass {
          public String field1 = 'value';
          
          public void method1() {
            String result = this.field1; // Same-file reference with 'this' qualifier
            this.method2(); // Same-file method call with 'this' qualifier
          }
          
          public void method2() {
            // Method implementation
          }
        }
      `;

      const listener = new ApexSymbolCollectorListener();
      const compilerService = new CompilerService();
      const result = compilerService.compile(
        sourceCode,
        'file:///TestClass.cls',
        listener,
      );

      expect(result.result).toBeDefined();
      const symbolTable = result.result!;

      // Add the symbol table to the manager
      await symbolManager.addSymbolTable(symbolTable, 'file:///TestClass.cls');

      // Wait for reference processing to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Find the method1 symbol
      const method1Symbols = symbolManager.findSymbolByName('method1');
      const method1 = method1Symbols.find((s) => s.kind === SymbolKind.Method);
      expect(method1).toBeDefined();

      if (method1) {
        const referencesFrom = symbolManager.findReferencesFrom(method1);

        // Should have reference to field1 (via this.field1)
        const field1Ref = referencesFrom.find(
          (ref) => ref.symbol.name === 'field1',
        );
        expect(field1Ref).toBeDefined();

        // Should have reference to method2 (via this.method2())
        const method2Ref = referencesFrom.find(
          (ref) => ref.symbol.name === 'method2',
        );
        expect(method2Ref).toBeDefined();
      }

      // Verify these references were NOT deferred (they're same-file)
      // Instead, they should be directly in the graph
      // Note: We access private properties for testing - these casts bypass TypeScript's
      // access control to verify internal implementation details
      const graph = (symbolManager as any).symbolGraph as ApexSymbolGraph;
      const deferredRefs = (graph as any).deferredReferences;

      // field1 and method2 should not be in deferred references (they're same-file)
      const field1Deferred = deferredRefs?.get('field1');
      const method2Deferred = deferredRefs?.get('method2');

      // These should be undefined since they're same-file and resolved directly
      expect(field1Deferred).toBeUndefined();
      expect(method2Deferred).toBeUndefined();

      // Verify the references are actually in the graph by checking referencesFrom
      // This confirms they were processed directly, not deferred
      if (method1) {
        const referencesFrom = symbolManager.findReferencesFrom(method1);
        const field1Ref = referencesFrom.find(
          (ref) => ref.symbol.name === 'field1',
        );
        const method2Ref = referencesFrom.find(
          (ref) => ref.symbol.name === 'method2',
        );

        // These should exist in the graph (not deferred)
        expect(field1Ref).toBeDefined();
        expect(method2Ref).toBeDefined();
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle references when source symbol cannot be resolved', async () => {
      const sourceCode = `
        public class TestClass {
          public void method1() {
            String localVar = field1; // Reference to non-existent field
          }
        }
      `;

      const listener = new ApexSymbolCollectorListener();
      const compilerService = new CompilerService();
      const result = compilerService.compile(
        sourceCode,
        'file:///TestClass.cls',
        listener,
      );

      expect(result.result).toBeDefined();
      const symbolTable = result.result!;

      // Add the symbol table to the manager
      await symbolManager.addSymbolTable(symbolTable, 'file:///TestClass.cls');

      // Wait for reference processing to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should not crash - references to non-existent symbols should be deferred
      // Note: We access private properties for testing - these casts bypass TypeScript's
      // access control to verify internal implementation details
      const graph = (symbolManager as any).symbolGraph as ApexSymbolGraph;
      const deferredRefs = (graph as any).deferredReferences;

      // field1 should be deferred since it doesn't exist
      const field1Deferred = deferredRefs?.get('field1');
      expect(field1Deferred).toBeDefined();
    });

    it('should handle empty class gracefully', async () => {
      const sourceCode = `
        public class TestClass {
        }
      `;

      const listener = new ApexSymbolCollectorListener();
      const compilerService = new CompilerService();
      const result = compilerService.compile(
        sourceCode,
        'file:///TestClass.cls',
        listener,
      );

      expect(result.result).toBeDefined();
      const symbolTable = result.result!;

      // Add the symbol table to the manager
      await symbolManager.addSymbolTable(symbolTable, 'file:///TestClass.cls');

      // Wait for reference processing to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should not crash - empty class should be handled gracefully
      const stats = symbolManager.getStats();
      expect(stats.totalSymbols).toBeGreaterThan(0); // At least the class symbol
    });

    it('should handle references in try-catch blocks', async () => {
      const sourceCode = `
        public class TestClass {
          public String field1 = 'value';
          
          public void method1() {
            try {
              String localVar = field1;
              method2();
            } catch (Exception e) {
              String errorVar = field1;
            }
          }
          
          public void method2() {
            // Method implementation
          }
        }
      `;

      const listener = new ApexSymbolCollectorListener();
      const compilerService = new CompilerService();
      const result = compilerService.compile(
        sourceCode,
        'file:///TestClass.cls',
        listener,
      );

      expect(result.result).toBeDefined();
      const symbolTable = result.result!;

      // Add the symbol table to the manager
      await symbolManager.addSymbolTable(symbolTable, 'file:///TestClass.cls');

      // Wait for reference processing to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Find the method1 symbol
      const method1Symbols = symbolManager.findSymbolByName('method1');
      const method1 = method1Symbols.find((s) => s.kind === SymbolKind.Method);
      expect(method1).toBeDefined();

      if (method1) {
        const referencesFrom = symbolManager.findReferencesFrom(method1);

        // Should have references to field1 (from both try and catch blocks)
        const field1Refs = referencesFrom.filter(
          (ref) => ref.symbol.name === 'field1',
        );
        expect(field1Refs.length).toBeGreaterThan(0);

        // Should have reference to method2 (from try block)
        const method2Ref = referencesFrom.find(
          (ref) => ref.symbol.name === 'method2',
        );
        expect(method2Ref).toBeDefined();
      }
    });
  });

  describe('Performance Optimization Verification', () => {
    it('should process same-file references without unnecessary graph lookups', async () => {
      const sourceCode = `
        public class TestClass {
          public String field1 = 'value';
          public String field2 = 'value2';
          public String field3 = 'value3';
          
          public void method1() {
            String var1 = field1;
            String var2 = field2;
            String var3 = field3;
            method2();
            method3();
          }
          
          public void method2() {}
          public void method3() {}
        }
      `;

      const listener = new ApexSymbolCollectorListener();
      const compilerService = new CompilerService();
      const result = compilerService.compile(
        sourceCode,
        'file:///TestClass.cls',
        listener,
      );

      expect(result.result).toBeDefined();
      const symbolTable = result.result!;

      // Add the symbol table to the manager
      await symbolManager.addSymbolTable(symbolTable, 'file:///TestClass.cls');

      // Wait for reference processing to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify all same-file references were processed
      const method1Symbols = symbolManager.findSymbolByName('method1');
      const method1 = method1Symbols.find((s) => s.kind === SymbolKind.Method);
      expect(method1).toBeDefined();

      if (method1) {
        const referencesFrom = symbolManager.findReferencesFrom(method1);

        // Should have references to all fields and methods
        expect(referencesFrom.length).toBeGreaterThanOrEqual(5);

        const field1Ref = referencesFrom.find(
          (ref) => ref.symbol.name === 'field1',
        );
        const field2Ref = referencesFrom.find(
          (ref) => ref.symbol.name === 'field2',
        );
        const field3Ref = referencesFrom.find(
          (ref) => ref.symbol.name === 'field3',
        );
        const method2Ref = referencesFrom.find(
          (ref) => ref.symbol.name === 'method2',
        );
        const method3Ref = referencesFrom.find(
          (ref) => ref.symbol.name === 'method3',
        );

        expect(field1Ref).toBeDefined();
        expect(field2Ref).toBeDefined();
        expect(field3Ref).toBeDefined();
        expect(method2Ref).toBeDefined();
        expect(method3Ref).toBeDefined();
      }

      // Verify stats
      const stats = symbolManager.getStats();
      expect(stats.totalReferences).toBeGreaterThan(0);
    });
  });
});
