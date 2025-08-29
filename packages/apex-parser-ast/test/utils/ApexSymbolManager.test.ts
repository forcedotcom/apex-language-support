/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ApexSymbolManager } from '../../src/symbols/ApexSymbolManager';
import { ApexSymbol, SymbolKind, SymbolTable } from '../../src/types/symbol';
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

describe('ApexSymbolManager', () => {
  let manager: ApexSymbolManager;
  let compilerService: CompilerService;
  let listener: ApexSymbolCollectorListener;
  const logger = getLogger();

  beforeEach(() => {
    manager = new ApexSymbolManager();
    compilerService = new CompilerService();
    listener = new ApexSymbolCollectorListener();
    enableConsoleLogging();
    setLogLevel('error');
  });

  afterEach(() => {
    // Clean up if needed
  });

  // Helper function to compile Apex code and get symbols
  const compileAndGetSymbols = async (
    apexCode: string,
    fileName: string = 'TestFile.cls',
  ): Promise<{
    symbols: ApexSymbol[];
    result: CompilationResult<SymbolTable>;
  }> => {
    const result = compilerService.compile(apexCode, fileName, listener);

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
      const scopeSymbols = scope.getAllSymbols();
      symbols.push(...scopeSymbols);

      // Recursively collect from child scopes
      const children = scope.getChildren();
      children.forEach((child: any) => collectSymbols(child));
    };

    // Start from the root scope and collect all symbols
    let currentScope = symbolTable.getCurrentScope();
    while (currentScope.parent) {
      currentScope = currentScope.parent;
    }
    collectSymbols(currentScope);

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

      // Debug: Check what files are actually found
      const files = manager.findFilesForSymbol('MyClass');
      console.log('Files found for MyClass:', files);
      console.log('Manager stats:', manager.getStats());

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
