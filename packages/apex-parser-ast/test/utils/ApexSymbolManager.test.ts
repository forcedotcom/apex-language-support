/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ApexSymbolManager } from '../../src/symbols/ApexSymbolManager';
import {
  ApexSymbol,
  SymbolKind,
  SymbolTable,
  SymbolFactory,
  ScopeSymbol,
} from '../../src/types/symbol';
import { ReferenceType } from '../../src/symbols/ApexSymbolGraph';
import {
  CompilerService,
  CompilationResult,
} from '../../src/parser/compilerService';
import { ApexSymbolCollectorListener } from '../../src/parser/listeners/ApexSymbolCollectorListener';
import {
  enableConsoleLogging,
  getLogger,
  setLogLevel,
} from '@salesforce/apex-lsp-shared';
import {
  initialize as schedulerInitialize,
  shutdown as schedulerShutdown,
  reset as schedulerReset,
} from '../../src/queue/priority-scheduler-utils';
import { Effect } from 'effect';

describe('ApexSymbolManager', () => {
  let manager: ApexSymbolManager;
  let compilerService: CompilerService;
  const logger = getLogger();

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
    } catch (error) {
      // Ignore errors - scheduler might not be initialized or already shut down
    }
    // Reset scheduler state after shutdown
    try {
      await Effect.runPromise(schedulerReset());
    } catch (error) {
      // Ignore errors - scheduler might not be initialized
    }
  });

  beforeEach(() => {
    manager = new ApexSymbolManager();
    compilerService = new CompilerService();
    enableConsoleLogging();
    setLogLevel('error');
  });

  afterEach(() => {
    // Clean up if needed
    if (manager) {
      manager.clear();
    }
  });

  // Helper function to compile Apex code and get symbols
  const compileAndGetSymbols = async (
    apexCode: string,
    fileName: string = 'TestFile.cls',
  ): Promise<{
    symbols: ApexSymbol[];
    result: CompilationResult<SymbolTable>;
  }> => {
    const result = compilerService.compile(
      apexCode,
      fileName,
      new ApexSymbolCollectorListener(),
    );

    if (result.errors.length > 0) {
      logger.warn(
        () =>
          `Compilation warnings: ${result.errors.map((e) => e.message).join(', ')}`,
      );
    }

    const symbolTable = result.result;
    if (!symbolTable) {
      throw new Error('Failed to get symbol table from compilation');
    }

    // Get all symbols from the symbol table
    const symbols: ApexSymbol[] = [];
    const collectSymbols = (scope: any) => {
      const scopeSymbols = symbolTable.getSymbolsInScope(scope.id);
      symbols.push(...scopeSymbols);

      // Recursively collect from child scopes
      const children = symbolTable
        .getSymbolsInScope(scope.id)
        .filter(
          (s) => s.parentId === scope.id && s.kind === SymbolKind.Block,
        ) as ScopeSymbol[];
      children.forEach((child: any) => collectSymbols(child));
    };

    // Start from the root scope and collect all symbols
    // Find root scope (file scope has no parentId)
    const rootScope = symbolTable
      .getAllSymbols()
      .find(
        (s) => s.kind === SymbolKind.Block && s.scopeType === 'file',
      ) as ScopeSymbol;
    if (rootScope) {
      collectSymbols(rootScope);
    } else {
      // Fallback: use file scope (root)
      const fileScope = symbolTable
        .getAllSymbols()
        .find(
          (s) => s.kind === SymbolKind.Block && (s as ScopeSymbol).scopeType === 'file',
        ) as ScopeSymbol | undefined;
      if (fileScope) {
        collectSymbols(fileScope);
      }
    }

    return { symbols, result };
  };

  // ============================================================================
  // Phase 2.1: Symbol Management Methods
  // ============================================================================

  describe('Symbol Management', () => {
    it('should add symbols to the manager from compiled code', async () => {
      const apexCode = `
        public class MyClass {
          public void myMethod() {
            // method implementation
          }
        }
      `;

      const { result } = await compileAndGetSymbols(apexCode, 'MyClass.cls');

      // Add the full symbol table to the manager
      if (result.result) {
        manager.addSymbolTable(result.result, 'MyClass.cls');
      }

      const stats = manager.getStats();
      expect(stats.totalSymbols).toBeGreaterThan(0);
      expect(stats.totalFiles).toBe(1);
    });

    it('should handle multiple symbols with the same name from different files', async () => {
      const apexCode1 = `
        public class MyClass {
          public void method1() {}
        }
      `;

      const apexCode2 = `
        public class MyClass {
          public void method2() {}
        }
      `;

      const { result: result1 } = await compileAndGetSymbols(
        apexCode1,
        'File1.cls',
      );
      const { result: result2 } = await compileAndGetSymbols(
        apexCode2,
        'File2.cls',
      );

      // Add the full symbol tables to the manager
      if (result1.result) {
        manager.addSymbolTable(result1.result, 'File1.cls');
      }
      if (result2.result) {
        manager.addSymbolTable(result2.result, 'File2.cls');
      }

      // Check that we can find symbols in both files
      const symbolsInFile1 = manager.findSymbolsInFile('File1.cls');
      const symbolsInFile2 = manager.findSymbolsInFile('File2.cls');

      // Should find symbols in both files
      expect(symbolsInFile1.length).toBeGreaterThan(0);
      expect(symbolsInFile2.length).toBeGreaterThan(0);

      // Should find MyClass in both files
      const myClassInFile1 = symbolsInFile1.find((s) => s.name === 'MyClass');
      const myClassInFile2 = symbolsInFile2.find((s) => s.name === 'MyClass');

      expect(myClassInFile1).toBeDefined();
      expect(myClassInFile2).toBeDefined();
    });

    it('should remove all symbols from a file', async () => {
      const apexCode = `
        public class MyClass {
          public String myField;
          public void myMethod() {}
        }
      `;

      const { result } = await compileAndGetSymbols(apexCode, 'MyClass.cls');

      // Add the full symbol table to the manager
      if (result.result) {
        manager.addSymbolTable(result.result, 'MyClass.cls');
      }

      // Add a symbol to another file
      const otherApexCode = `
        public class OtherClass {
          public void otherMethod() {}
        }
      `;
      const { result: otherResult } = await compileAndGetSymbols(
        otherApexCode,
        'OtherClass.cls',
      );
      if (otherResult.result) {
        manager.addSymbolTable(otherResult.result, 'OtherClass.cls');
      }

      const statsBefore = manager.getStats();
      expect(statsBefore.totalSymbols).toBeGreaterThan(0);

      // Remove the first file
      manager.removeFile('MyClass.cls');

      const statsAfter = manager.getStats();
      expect(statsAfter.totalSymbols).toBeLessThan(statsBefore.totalSymbols);

      const remainingSymbols = manager.findSymbolsInFile('OtherClass.cls');
      expect(remainingSymbols.length).toBeGreaterThan(0);
    });

    it('should refresh with new symbol data', async () => {
      const apexCode1 = `
        public class Class1 {
          public void method1() {}
        }
      `;
      const apexCode2 = `
        public class Class2 {
          public void method2() {}
        }
      `;

      const { result: result1 } = await compileAndGetSymbols(
        apexCode1,
        'File1.cls',
      );
      const { result: result2 } = await compileAndGetSymbols(
        apexCode2,
        'File2.cls',
      );

      // Add the full symbol tables to the manager
      if (result1.result) {
        manager.addSymbolTable(result1.result, 'File1.cls');
      }
      if (result2.result) {
        manager.addSymbolTable(result2.result, 'File2.cls');
      }

      // Verify initial state
      let stats = manager.getStats();
      expect(stats.totalSymbols).toBeGreaterThan(0);
      expect(stats.totalFiles).toBe(2);

      // Refresh with empty data - create a minimal symbol table
      const emptySymbolTable = new SymbolTable();
      manager.refresh(emptySymbolTable);

      // Verify cleared state
      stats = manager.getStats();
      expect(stats.totalSymbols).toBe(0);
      expect(stats.totalFiles).toBe(0);
    });
  });

  // ============================================================================
  // Phase 2.2: Symbol Lookup Methods
  // ============================================================================

  describe('Symbol Lookup', () => {
    it('should find symbols by name from compiled code', async () => {
      const apexCode = `
        public class MyClass {
          public void myMethod() {}
          private String myField;
        }
      `;

      const { result } = await compileAndGetSymbols(apexCode, 'MyClass.cls');

      // Add the full symbol table to the manager
      if (result.result) {
        manager.addSymbolTable(result.result, 'MyClass.cls');
      }

      const symbolsByName = manager.findSymbolByName('MyClass');
      expect(symbolsByName.length).toBeGreaterThan(0);
      expect(symbolsByName[0].name).toBe('MyClass');
    });

    it('should find symbols by FQN', async () => {
      const apexCode = `
        public class MyClass {
          public void myMethod() {}
        }
      `;

      const { result } = await compileAndGetSymbols(apexCode, 'MyClass.cls');

      // Add the full symbol table to the manager
      if (result.result) {
        manager.addSymbolTable(result.result, 'MyClass.cls');
      }

      // Find by FQN (assuming default namespace)
      const found = manager.findSymbolByFQN('MyClass');
      expect(found).toBeDefined();
      expect(found?.name).toBe('MyClass');
    });

    it('should return null for non-existent FQN', () => {
      const found = manager.findSymbolByFQN('NonExistent.Class');
      expect(found).toBeNull();
    });

    it('should find all symbols in a file', async () => {
      const apexCode = `
        public class MyClass {
          public void myMethod() {}
          private String myField;
        }
      `;

      const { result } = await compileAndGetSymbols(apexCode, 'MyClass.cls');

      // Add the full symbol table to the manager
      if (result.result) {
        manager.addSymbolTable(result.result, 'MyClass.cls');
      }

      const fileSymbols = manager.findSymbolsInFile('MyClass.cls');
      expect(fileSymbols.length).toBeGreaterThan(0);

      // Should contain the class and its members
      const symbolNames = fileSymbols.map((s) => s.name);
      expect(symbolNames).toContain('MyClass');
    });

    it('should find all files containing a symbol', async () => {
      const apexCode1 = `
        public class MyClass {
          public void method1() {}
        }
      `;
      const apexCode2 = `
        public class MyClass {
          public void method2() {}
        }
      `;

      const { result: result1 } = await compileAndGetSymbols(
        apexCode1,
        'File1.cls',
      );
      const { result: result2 } = await compileAndGetSymbols(
        apexCode2,
        'File2.cls',
      );

      // Add the full symbol tables to the manager
      if (result1.result) {
        manager.addSymbolTable(result1.result, 'File1.cls');
      }
      if (result2.result) {
        manager.addSymbolTable(result2.result, 'File2.cls');
      }

      // Check what files are actually found
      const files = manager.findFilesForSymbol('MyClass');

      expect(files.length).toBeGreaterThan(0);
      expect(files).toContain('File1.cls');
      expect(files).toContain('File2.cls');
    });

    it('should return empty array for non-existent symbol', () => {
      const files = manager.findFilesForSymbol('NonExistent');
      expect(files.length).toBe(0);
    });
  });

  // ============================================================================
  // Phase 2.3: Graph-Based Relationship Queries
  // ============================================================================

  describe('Relationship Queries', () => {
    it('should find references to a symbol', async () => {
      const apexCode = `
        public class MyClass {
          public void myMethod() {}
        }
      `;

      const { result } = await compileAndGetSymbols(apexCode, 'MyClass.cls');

      // Add the full symbol table to the manager
      if (result.result) {
        manager.addSymbolTable(result.result, 'MyClass.cls');
      }

      // Find the class symbol from the manager instead of the collected symbols
      const classSymbols = manager.findSymbolByName('MyClass');
      const classSymbol = classSymbols.find((s) => s.kind === SymbolKind.Class);
      expect(classSymbol).toBeDefined();

      if (classSymbol) {
        const references = manager.findReferencesTo(classSymbol);
        expect(Array.isArray(references)).toBe(true);
      }
    });

    it('should find references from a symbol', async () => {
      const apexCode = `
        public class MyClass {
          public void myMethod() {}
        }
      `;

      const { result } = await compileAndGetSymbols(apexCode, 'MyClass.cls');

      // Add the full symbol table to the manager
      if (result.result) {
        manager.addSymbolTable(result.result, 'MyClass.cls');
      }

      // Find the class symbol from the manager instead of the collected symbols
      const classSymbols = manager.findSymbolByName('MyClass');
      const classSymbol = classSymbols.find((s) => s.kind === SymbolKind.Class);
      expect(classSymbol).toBeDefined();

      if (classSymbol) {
        const references = manager.findReferencesFrom(classSymbol);
        expect(Array.isArray(references)).toBe(true);
      }
    });

    it('should find related symbols by relationship type', async () => {
      const apexCode = `
        public class MyClass {
          public void myMethod() {}
        }
      `;

      const { result } = await compileAndGetSymbols(apexCode, 'MyClass.cls');

      // Add the full symbol table to the manager
      if (result.result) {
        manager.addSymbolTable(result.result, 'MyClass.cls');
      }

      // Find the class symbol from the manager instead of the collected symbols
      const classSymbols = manager.findSymbolByName('MyClass');
      const classSymbol = classSymbols.find((s) => s.kind === SymbolKind.Class);
      expect(classSymbol).toBeDefined();

      if (classSymbol) {
        const relatedSymbols = manager.findRelatedSymbols(
          classSymbol,
          ReferenceType.METHOD_CALL,
        );
        expect(Array.isArray(relatedSymbols)).toBe(true);
      }
    });

    it('should handle empty relationship queries gracefully', async () => {
      const apexCode = `
        public class MyClass {
          public void myMethod() {}
        }
      `;

      const { result } = await compileAndGetSymbols(apexCode, 'MyClass.cls');

      // Add the full symbol table to the manager
      if (result.result) {
        manager.addSymbolTable(result.result, 'MyClass.cls');
      }

      // Find the class symbol from the manager instead of the collected symbols
      const classSymbols = manager.findSymbolByName('MyClass');
      const classSymbol = classSymbols.find((s) => s.kind === SymbolKind.Class);
      expect(classSymbol).toBeDefined();

      if (classSymbol) {
        const references = manager.findReferencesTo(classSymbol);
        expect(references.length).toBeGreaterThanOrEqual(0);

        const referencesFrom = manager.findReferencesFrom(classSymbol);
        expect(referencesFrom.length).toBeGreaterThanOrEqual(0);

        const relatedSymbols = manager.findRelatedSymbols(
          classSymbol,
          ReferenceType.METHOD_CALL,
        );
        expect(relatedSymbols.length).toBeGreaterThanOrEqual(0);
      }
    });
  });

  // ============================================================================
  // Utility Methods
  // ============================================================================

  describe('Statistics and Utilities', () => {
    it('should provide accurate statistics', async () => {
      const apexCode = `
        public class MyClass {
          public void myMethod() {}
          private String myField;
        }
      `;

      const { result } = await compileAndGetSymbols(apexCode, 'MyClass.cls');

      // Add the full symbol table to the manager
      if (result.result) {
        manager.addSymbolTable(result.result, 'MyClass.cls');
      }

      const stats = manager.getStats();
      expect(stats.totalSymbols).toBeGreaterThan(0);
      expect(stats.totalFiles).toBe(1);
      expect(stats.totalReferences).toBeGreaterThanOrEqual(0);
      expect(stats.circularDependencies).toBeGreaterThanOrEqual(0);
      expect(typeof stats.cacheHitRate).toBe('number');
      expect(stats.cacheHitRate).toBeGreaterThanOrEqual(0);
      expect(stats.cacheHitRate).toBeLessThanOrEqual(1);
    });

    it('should handle empty manager statistics', () => {
      const stats = manager.getStats();
      expect(stats.totalSymbols).toBe(0);
      expect(stats.totalFiles).toBe(0);
      expect(stats.totalReferences).toBe(0);
      expect(stats.circularDependencies).toBe(0);
    });

    it('should provide consistent statistics after operations', async () => {
      const apexCode = `
        public class MyClass {
          public void myMethod() {}
        }
      `;

      const { result } = await compileAndGetSymbols(apexCode, 'MyClass.cls');

      // Initial state
      let stats = manager.getStats();
      expect(stats.totalSymbols).toBe(0);

      // After adding symbol table
      if (result.result) {
        manager.addSymbolTable(result.result, 'MyClass.cls');
      }
      stats = manager.getStats();
      expect(stats.totalSymbols).toBeGreaterThan(0);

      // After removing file
      manager.removeFile('MyClass.cls');
      stats = manager.getStats();
      expect(stats.totalSymbols).toBe(0);
    });
  });

  // ============================================================================
  // Edge Cases and Error Handling
  // ============================================================================

  describe('Edge Cases and Error Handling', () => {
    it('should handle duplicate symbol additions gracefully', async () => {
      const apexCode = `
        public class MyClass {
          public void myMethod() {}
        }
      `;

      const { result } = await compileAndGetSymbols(apexCode, 'MyClass.cls');

      // Add the full symbol table to the manager
      if (result.result) {
        manager.addSymbolTable(result.result, 'MyClass.cls');
      }

      // Try to add the same symbol table again
      if (result.result) {
        manager.addSymbolTable(result.result, 'MyClass.cls');
      }

      const stats = manager.getStats();
      // Should not create duplicates
      expect(stats.totalSymbols).toBeGreaterThan(0);
    });

    it('should handle removal of non-existent files', () => {
      // Should not throw an error
      expect(() => {
        manager.removeFile('NonExistentFile.cls');
      }).not.toThrow();
    });

    it('should handle lookup of non-existent symbols', () => {
      const symbols = manager.findSymbolByName('NonExistent');
      expect(symbols.length).toBe(0);

      const found = manager.findSymbolByFQN('NonExistent.Class');
      expect(found).toBeNull();

      const fileSymbols = manager.findSymbolsInFile('NonExistentFile.cls');
      expect(fileSymbols.length).toBe(0);
    });

    it('should handle empty symbol tables', () => {
      // Should not throw an error when no symbols are present
      const stats = manager.getStats();
      expect(stats.totalSymbols).toBe(0);
      expect(stats.totalFiles).toBe(0);
    });
  });

  // ============================================================================
  // Performance Considerations
  // ============================================================================

  describe('Performance Considerations', () => {
    it('should handle large numbers of symbols efficiently', async () => {
      const startTime = Date.now();

      // Create multiple classes
      for (let i = 0; i < 10; i++) {
        const apexCode = `
          public class Class${i} {
            public void method${i}() {}
            private String field${i};
          }
        `;
        const { result } = await compileAndGetSymbols(
          apexCode,
          `Class${i}.cls`,
        );

        // Add the full symbol table to the manager
        if (result.result) {
          manager.addSymbolTable(result.result, `Class${i}.cls`);
        }
      }

      const addTime = Date.now() - startTime;
      expect(addTime).toBeLessThan(5000); // Should complete within 5 seconds

      // Test lookup performance
      const lookupStartTime = Date.now();
      const foundSymbols = manager.findSymbolByName('Class5');
      const lookupTime = Date.now() - lookupStartTime;
      expect(lookupTime).toBeLessThan(100); // Should complete within 100ms
      expect(foundSymbols.length).toBeGreaterThan(0);

      const stats = manager.getStats();
      expect(stats.totalSymbols).toBeGreaterThan(0);
      expect(stats.totalFiles).toBe(10);
    });

    it('should maintain performance after cache operations', async () => {
      const apexCode = `
        public class MyClass {
          public void myMethod() {}
        }
      `;

      const { result } = await compileAndGetSymbols(apexCode, 'MyClass.cls');

      // Add the full symbol table to the manager
      if (result.result) {
        manager.addSymbolTable(result.result, 'MyClass.cls');
      }

      // Find the class symbol from the manager instead of the collected symbols
      const classSymbols = manager.findSymbolByName('MyClass');
      const classSymbol = classSymbols.find((s) => s.kind === SymbolKind.Class);
      expect(classSymbol).toBeDefined();

      if (classSymbol) {
        // First lookup (cache miss)
        const firstLookup = manager.findReferencesTo(classSymbol);

        // Second lookup (cache hit)
        const secondLookup = manager.findReferencesTo(classSymbol);

        // Both should return the same result
        expect(firstLookup).toEqual(secondLookup);
      }
    });
  });

  // ============================================================================
  // Position Data Integrity Tests
  // ============================================================================

  describe('Position Data Integrity', () => {
    it('should preserve symbol position data between add and find operations', async () => {
      const apexCode = `
        public class MyClass {
          public void myMethod() {
            // method implementation
          }
          private String myField;
        }
      `;

      const { result } = await compileAndGetSymbols(apexCode, 'MyClass.cls');

      // Add the full symbol table to the manager
      if (result.result) {
        manager.addSymbolTable(result.result, 'MyClass.cls');
      }

      // Find the class symbol
      const classSymbols = manager.findSymbolByName('MyClass');
      const classSymbol = classSymbols.find((s) => s.kind === SymbolKind.Class);
      expect(classSymbol).toBeDefined();

      if (classSymbol) {
        // Verify position data is preserved
        expect(classSymbol.location).toBeDefined();
        expect(classSymbol.location.symbolRange).toBeDefined();
        expect(classSymbol.location.identifierRange).toBeDefined();

        // Verify the ranges have valid line/column data
        expect(classSymbol.location.symbolRange.startLine).toBeGreaterThan(0);
        expect(classSymbol.location.symbolRange.endLine).toBeGreaterThan(0);
        expect(
          classSymbol.location.symbolRange.startColumn,
        ).toBeGreaterThanOrEqual(0);
        expect(
          classSymbol.location.symbolRange.endColumn,
        ).toBeGreaterThanOrEqual(0);

        expect(classSymbol.location.identifierRange.startLine).toBeGreaterThan(
          0,
        );
        expect(classSymbol.location.identifierRange.endLine).toBeGreaterThan(0);
        expect(
          classSymbol.location.identifierRange.startColumn,
        ).toBeGreaterThanOrEqual(0);
        expect(
          classSymbol.location.identifierRange.endColumn,
        ).toBeGreaterThanOrEqual(0);
      }
    });

    it('should preserve method symbol position data with exact ranges', async () => {
      const apexCode = `
        public class TestClass {
          public void testMethod() {
            System.debug('test');
          }
        }
      `;

      const { result } = await compileAndGetSymbols(apexCode, 'TestClass.cls');

      if (result.result) {
        manager.addSymbolTable(result.result, 'TestClass.cls');
      }

      // Find the method symbol
      const methodSymbols = manager.findSymbolByName('testMethod');
      const methodSymbol = methodSymbols.find(
        (s) => s.kind === SymbolKind.Method,
      );
      expect(methodSymbol).toBeDefined();

      if (methodSymbol) {
        // Store original position data
        const originalLocation = { ...methodSymbol.location };
        const originalSymbolRange = { ...methodSymbol.location.symbolRange };
        const originalIdentifierRange = {
          ...methodSymbol.location.identifierRange,
        };

        // Find the symbol again to verify data hasn't changed
        const foundAgain = manager.findSymbolByName('testMethod');
        const foundMethod = foundAgain.find(
          (s) => s.kind === SymbolKind.Method,
        );
        expect(foundMethod).toBeDefined();

        if (foundMethod) {
          // Verify position data is identical
          expect(foundMethod.location.symbolRange).toEqual(originalSymbolRange);
          expect(foundMethod.location.identifierRange).toEqual(
            originalIdentifierRange,
          );
          expect(foundMethod.location).toEqual(originalLocation);
        }
      }
    });

    it('should preserve position data when adding duplicate symbols', async () => {
      const apexCode = `
        public class MyClass {
          public void myMethod() {}
        }
      `;

      const { result } = await compileAndGetSymbols(apexCode, 'MyClass.cls');

      if (result.result) {
        // Add symbol table twice
        manager.addSymbolTable(result.result, 'MyClass.cls');
        manager.addSymbolTable(result.result, 'MyClass.cls');
      }

      // Find the symbol
      const classSymbols = manager.findSymbolByName('MyClass');
      const classSymbol = classSymbols.find((s) => s.kind === SymbolKind.Class);
      expect(classSymbol).toBeDefined();

      if (classSymbol) {
        // Verify position data is still valid after duplicate addition
        expect(classSymbol.location.symbolRange.startLine).toBeGreaterThan(0);
        expect(classSymbol.location.symbolRange.endLine).toBeGreaterThan(0);
        expect(classSymbol.location.identifierRange.startLine).toBeGreaterThan(
          0,
        );
        expect(classSymbol.location.identifierRange.endLine).toBeGreaterThan(0);
      }
    });

    it('should preserve position data across different lookup methods', async () => {
      const apexCode = `
        public class MyClass {
          public void myMethod() {}
          private String myField;
        }
      `;

      const { result } = await compileAndGetSymbols(apexCode, 'MyClass.cls');

      if (result.result) {
        manager.addSymbolTable(result.result, 'MyClass.cls');
      }

      // Test different lookup methods
      const byName = manager.findSymbolByName('MyClass');
      const byFQN = manager.findSymbolByFQN('MyClass');
      const inFile = manager.findSymbolsInFile('MyClass.cls');

      const classByName = byName.find((s) => s.kind === SymbolKind.Class);
      const classByFQN = byFQN;
      const classInFile = inFile.find((s) => s.kind === SymbolKind.Class);

      expect(classByName).toBeDefined();
      expect(classByFQN).toBeDefined();
      expect(classInFile).toBeDefined();

      if (classByName && classByFQN && classInFile) {
        // All should have identical position data
        expect(classByName.location).toEqual(classByFQN.location);
        expect(classByName.location).toEqual(classInFile.location);
        expect(classByFQN.location).toEqual(classInFile.location);
      }
    });

    it('should preserve position data when FQN is calculated during add', async () => {
      // Create a symbol without FQN to test FQN calculation
      const symbol = SymbolFactory.createMinimalSymbol(
        'TestClass',
        SymbolKind.Class,
        {
          symbolRange: {
            startLine: 1,
            startColumn: 0,
            endLine: 5,
            endColumn: 0,
          },
          identifierRange: {
            startLine: 1,
            startColumn: 13,
            endLine: 1,
            endColumn: 22,
          },
        },
        'TestClass.cls',
      );

      // Store original position data
      const originalLocation = { ...symbol.location };
      const originalSymbolRange = { ...symbol.location.symbolRange };
      const originalIdentifierRange = { ...symbol.location.identifierRange };

      // Add symbol (this will calculate FQN)
      manager.addSymbol(symbol, 'TestClass.cls');

      // Find the symbol
      const found = manager.findSymbolByName('TestClass');
      const foundClass = found.find((s) => s.kind === SymbolKind.Class);
      expect(foundClass).toBeDefined();

      if (foundClass) {
        // Verify position data is unchanged despite FQN calculation
        expect(foundClass.location.symbolRange).toEqual(originalSymbolRange);
        expect(foundClass.location.identifierRange).toEqual(
          originalIdentifierRange,
        );
        expect(foundClass.location).toEqual(originalLocation);

        // Verify FQN was calculated
        expect(foundClass.fqn).toBeDefined();
        // FQN is normalized to lowercase for Apex case-insensitive convention
        expect(foundClass.fqn).toBe('testclass');
      }
    });

    it('should preserve position data when parent linkage is hydrated', async () => {
      // Create parent and child symbols
      const parentSymbol = SymbolFactory.createMinimalSymbol(
        'ParentClass',
        SymbolKind.Class,
        {
          symbolRange: {
            startLine: 1,
            startColumn: 0,
            endLine: 10,
            endColumn: 0,
          },
          identifierRange: {
            startLine: 1,
            startColumn: 13,
            endLine: 1,
            endColumn: 24,
          },
        },
        'ParentClass.cls',
      );

      const childSymbol = SymbolFactory.createMinimalSymbol(
        'childMethod',
        SymbolKind.Method,
        {
          symbolRange: {
            startLine: 3,
            startColumn: 2,
            endLine: 5,
            endColumn: 2,
          },
          identifierRange: {
            startLine: 3,
            startColumn: 10,
            endLine: 3,
            endColumn: 20,
          },
        },
        'ParentClass.cls',
        parentSymbol.id,
      );

      // Store original position data
      const originalChildLocation = { ...childSymbol.location };
      const originalParentLocation = { ...parentSymbol.location };

      // Add symbols
      manager.addSymbol(parentSymbol, 'ParentClass.cls');
      manager.addSymbol(childSymbol, 'ParentClass.cls');

      // Find symbols
      const foundParent = manager.findSymbolByName('ParentClass');
      const foundChild = manager.findSymbolByName('childMethod');

      const parentClass = foundParent.find((s) => s.kind === SymbolKind.Class);
      const childMethod = foundChild.find((s) => s.kind === SymbolKind.Method);

      expect(parentClass).toBeDefined();
      expect(childMethod).toBeDefined();

      if (parentClass && childMethod) {
        // Verify position data is unchanged despite parent linkage
        expect(parentClass.location).toEqual(originalParentLocation);
        expect(childMethod.location).toEqual(originalChildLocation);
      }
    });

    it('should preserve position data across file operations', async () => {
      const apexCode = `
        public class MyClass {
          public void myMethod() {}
        }
      `;

      const { result } = await compileAndGetSymbols(apexCode, 'MyClass.cls');

      if (result.result) {
        manager.addSymbolTable(result.result, 'MyClass.cls');
      }

      // Get original position data
      const originalSymbols = manager.findSymbolsInFile('MyClass.cls');
      const originalClass = originalSymbols.find(
        (s) => s.kind === SymbolKind.Class,
      );
      expect(originalClass).toBeDefined();

      if (originalClass) {
        const originalLocation = { ...originalClass.location };

        // Remove and re-add the file
        manager.removeFile('MyClass.cls');

        if (result.result) {
          manager.addSymbolTable(result.result, 'MyClass.cls');
        }

        // Find the symbol again
        const newSymbols = manager.findSymbolsInFile('MyClass.cls');
        const newClass = newSymbols.find((s) => s.kind === SymbolKind.Class);
        expect(newClass).toBeDefined();

        if (newClass) {
          // Position data should be identical
          expect(newClass.location).toEqual(originalLocation);
        }
      }
    });

    it('should preserve position data for complex nested symbols', async () => {
      const apexCode = `
        public class OuterClass {
          public class InnerClass {
            public void innerMethod() {}
            private String innerField;
          }
          public void outerMethod() {}
        }
      `;

      const { result } = await compileAndGetSymbols(apexCode, 'OuterClass.cls');

      if (result.result) {
        manager.addSymbolTable(result.result, 'OuterClass.cls');
      }

      // Find all symbols
      const allSymbols = manager.findSymbolsInFile('OuterClass.cls');
      const outerClass = allSymbols.find(
        (s) => s.name === 'OuterClass' && s.kind === SymbolKind.Class,
      );
      const innerClass = allSymbols.find(
        (s) => s.name === 'InnerClass' && s.kind === SymbolKind.Class,
      );
      const innerMethod = allSymbols.find(
        (s) => s.name === 'innerMethod' && s.kind === SymbolKind.Method,
      );
      const innerField = allSymbols.find(
        (s) => s.name === 'innerField' && s.kind === SymbolKind.Field,
      );
      const outerMethod = allSymbols.find(
        (s) => s.name === 'outerMethod' && s.kind === SymbolKind.Method,
      );

      // Verify all symbols have valid position data
      [outerClass, innerClass, innerMethod, innerField, outerMethod].forEach(
        (symbol) => {
          expect(symbol).toBeDefined();
          if (symbol) {
            expect(symbol.location.symbolRange.startLine).toBeGreaterThan(0);
            expect(symbol.location.symbolRange.endLine).toBeGreaterThan(0);
            expect(symbol.location.identifierRange.startLine).toBeGreaterThan(
              0,
            );
            expect(symbol.location.identifierRange.endLine).toBeGreaterThan(0);
          }
        },
      );

      // Verify nested structure maintains position relationships
      if (outerClass && innerClass) {
        expect(outerClass.location.symbolRange.startLine).toBeLessThan(
          innerClass.location.symbolRange.startLine,
        );
        expect(outerClass.location.symbolRange.endLine).toBeGreaterThan(
          innerClass.location.symbolRange.endLine,
        );
      }
    });
  });

  // ============================================================================
  // Complex Apex Code Tests
  // ============================================================================

  describe('Complex Apex Code', () => {
    it('should handle multiple classes in separate files', async () => {
      const baseClassCode = `
        public class BaseClass {
          public void baseMethod() {}
        }
      `;

      const derivedClassCode = `
        public class DerivedClass {
          public void derivedMethod() {}
        }
      `;

      const { result: baseResult } = await compileAndGetSymbols(
        baseClassCode,
        'BaseClass.cls',
      );

      const { result: derivedResult } = await compileAndGetSymbols(
        derivedClassCode,
        'DerivedClass.cls',
      );

      // Add both symbol tables to the manager
      if (baseResult.result) {
        manager.addSymbolTable(baseResult.result, 'BaseClass.cls');
      }
      if (derivedResult.result) {
        manager.addSymbolTable(derivedResult.result, 'DerivedClass.cls');
      }

      // Find the symbols from the manager
      const baseClassSymbols = manager.findSymbolByName('BaseClass');
      const derivedClassSymbols = manager.findSymbolByName('DerivedClass');

      const baseClass = baseClassSymbols.find(
        (s) => s.kind === SymbolKind.Class,
      );
      const derivedClass = derivedClassSymbols.find(
        (s) => s.kind === SymbolKind.Class,
      );

      expect(baseClass).toBeDefined();
      expect(derivedClass).toBeDefined();

      if (baseClass && derivedClass) {
        const baseReferences = manager.findReferencesTo(baseClass);
        const derivedReferences = manager.findReferencesTo(derivedClass);

        expect(Array.isArray(baseReferences)).toBe(true);
        expect(Array.isArray(derivedReferences)).toBe(true);
      }
    });

    it('should handle interface and class in separate files', async () => {
      const interfaceCode = `
        public interface MyInterface {
          void interfaceMethod();
        }
      `;

      const classCode = `
        public class MyClass {
          public void interfaceMethod() {}
        }
      `;

      const { result: interfaceResult } = await compileAndGetSymbols(
        interfaceCode,
        'MyInterface.cls',
      );

      const { result: classResult } = await compileAndGetSymbols(
        classCode,
        'MyClass.cls',
      );

      // Add both symbol tables to the manager
      if (interfaceResult.result) {
        manager.addSymbolTable(interfaceResult.result, 'MyInterface.cls');
      }
      if (classResult.result) {
        manager.addSymbolTable(classResult.result, 'MyClass.cls');
      }

      // Find the symbols from the manager
      const interfaceSymbols = manager.findSymbolByName('MyInterface');
      const classSymbols = manager.findSymbolByName('MyClass');
      const interfaceSymbol = interfaceSymbols.find(
        (s) => s.kind === SymbolKind.Interface,
      );
      const classSymbol = classSymbols.find((s) => s.kind === SymbolKind.Class);

      expect(interfaceSymbol).toBeDefined();
      expect(classSymbol).toBeDefined();

      if (interfaceSymbol && classSymbol) {
        const interfaceReferences = manager.findReferencesTo(interfaceSymbol);
        const classReferences = manager.findReferencesTo(classSymbol);

        expect(Array.isArray(interfaceReferences)).toBe(true);
        expect(Array.isArray(classReferences)).toBe(true);
      }
    });

    it('should handle enums and their values', async () => {
      const apexCode = `
        public enum MyEnum {
          VALUE1,
          VALUE2,
          VALUE3
        }
      `;

      const { result } = await compileAndGetSymbols(apexCode, 'EnumTest.cls');

      // Add the full symbol table to the manager
      if (result.result) {
        manager.addSymbolTable(result.result, 'EnumTest.cls');
      }

      // Find the enum symbol from the manager instead of the collected symbols
      const enumSymbols = manager.findSymbolByName('MyEnum');
      const enumSymbol = enumSymbols.find((s) => s.kind === SymbolKind.Enum);
      expect(enumSymbol).toBeDefined();

      if (enumSymbol) {
        const enumReferences = manager.findReferencesTo(enumSymbol);
        expect(Array.isArray(enumReferences)).toBe(true);
      }
    });

    it('should handle triggers', async () => {
      const apexCode = `
        trigger MyTrigger on Account (before insert, after insert) {
          // trigger logic
        }
      `;

      const { result } = await compileAndGetSymbols(
        apexCode,
        'MyTrigger.trigger',
      );

      // Add the full symbol table to the manager
      if (result.result) {
        manager.addSymbolTable(result.result, 'MyTrigger.trigger');
      }

      // Find the trigger symbol from the manager instead of the collected symbols
      const triggerSymbols = manager.findSymbolByName('MyTrigger');
      const triggerSymbol = triggerSymbols.find(
        (s) => s.kind === SymbolKind.Trigger,
      );
      expect(triggerSymbol).toBeDefined();

      if (triggerSymbol) {
        const triggerReferences = manager.findReferencesTo(triggerSymbol);
        expect(Array.isArray(triggerReferences)).toBe(true);
      }
    });
  });
});
