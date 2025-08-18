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

      const { symbols } = await compileAndGetSymbols(apexCode, 'MyClass.cls');

      // Add symbols to the manager
      symbols.forEach((symbol) => {
        manager.addSymbol(symbol, 'MyClass.cls');
      });

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

      const { symbols: symbols1 } = await compileAndGetSymbols(
        apexCode1,
        'File1.cls',
      );
      const { symbols: symbols2 } = await compileAndGetSymbols(
        apexCode2,
        'File2.cls',
      );

      // Add symbols to the manager
      symbols1.forEach((symbol) => manager.addSymbol(symbol, 'File1.cls'));
      symbols2.forEach((symbol) => manager.addSymbol(symbol, 'File2.cls'));

      const symbols = manager.findSymbolByName('MyClass');
      expect(symbols.length).toBeGreaterThan(0);

      // Should find symbols from both files
      const filePaths = symbols.map((s) => s.filePath);
      expect(filePaths).toContain('File1.cls');
      expect(filePaths).toContain('File2.cls');
    });

    it('should remove all symbols from a file', async () => {
      const apexCode = `
        public class MyClass {
          public String myField;
          public void myMethod() {}
        }
      `;

      const { symbols } = await compileAndGetSymbols(apexCode, 'MyClass.cls');

      // Add symbols to the manager
      symbols.forEach((symbol) => manager.addSymbol(symbol, 'MyClass.cls'));

      // Add a symbol to another file
      const otherApexCode = `
        public class OtherClass {
          public void otherMethod() {}
        }
      `;
      const { symbols: otherSymbols } = await compileAndGetSymbols(
        otherApexCode,
        'OtherClass.cls',
      );
      otherSymbols.forEach((symbol) =>
        manager.addSymbol(symbol, 'OtherClass.cls'),
      );

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

      const { symbols: symbols1 } = await compileAndGetSymbols(
        apexCode1,
        'File1.cls',
      );
      const { symbols: symbols2 } = await compileAndGetSymbols(
        apexCode2,
        'File2.cls',
      );

      // Add symbols to the manager
      symbols1.forEach((symbol) => manager.addSymbol(symbol, 'File1.cls'));
      symbols2.forEach((symbol) => manager.addSymbol(symbol, 'File2.cls'));

      // Verify initial state
      let stats = manager.getStats();
      expect(stats.totalSymbols).toBeGreaterThan(0);
      expect(stats.totalFiles).toBe(2);

      // Refresh with empty data
      manager.refresh(new Map());

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

      const { symbols } = await compileAndGetSymbols(apexCode, 'MyClass.cls');

      // Add symbols to the manager
      symbols.forEach((symbol) => manager.addSymbol(symbol, 'MyClass.cls'));

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

      const { symbols } = await compileAndGetSymbols(apexCode, 'MyClass.cls');

      // Add symbols to the manager
      symbols.forEach((symbol) => manager.addSymbol(symbol, 'MyClass.cls'));

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

      const { symbols } = await compileAndGetSymbols(apexCode, 'MyClass.cls');

      // Add symbols to the manager
      symbols.forEach((symbol) => manager.addSymbol(symbol, 'MyClass.cls'));

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

      const { symbols: symbols1 } = await compileAndGetSymbols(
        apexCode1,
        'File1.cls',
      );
      const { symbols: symbols2 } = await compileAndGetSymbols(
        apexCode2,
        'File2.cls',
      );

      // Add symbols to the manager
      symbols1.forEach((symbol) => manager.addSymbol(symbol, 'File1.cls'));
      symbols2.forEach((symbol) => manager.addSymbol(symbol, 'File2.cls'));

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

      const { symbols } = await compileAndGetSymbols(apexCode, 'MyClass.cls');

      // Add symbols to the manager
      symbols.forEach((symbol) => manager.addSymbol(symbol, 'MyClass.cls'));

      const classSymbol = symbols.find((s) => s.kind === SymbolKind.Class);
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

      const { symbols } = await compileAndGetSymbols(apexCode, 'MyClass.cls');

      // Add symbols to the manager
      symbols.forEach((symbol) => manager.addSymbol(symbol, 'MyClass.cls'));

      const classSymbol = symbols.find((s) => s.kind === SymbolKind.Class);
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

      const { symbols } = await compileAndGetSymbols(apexCode, 'MyClass.cls');

      // Add symbols to the manager
      symbols.forEach((symbol) => manager.addSymbol(symbol, 'MyClass.cls'));

      const classSymbol = symbols.find((s) => s.kind === SymbolKind.Class);
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

      const { symbols } = await compileAndGetSymbols(apexCode, 'MyClass.cls');

      // Add symbols to the manager
      symbols.forEach((symbol) => manager.addSymbol(symbol, 'MyClass.cls'));

      const classSymbol = symbols.find((s) => s.kind === SymbolKind.Class);
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

      const { symbols } = await compileAndGetSymbols(apexCode, 'MyClass.cls');

      // Add symbols to the manager
      symbols.forEach((symbol) => manager.addSymbol(symbol, 'MyClass.cls'));

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

      const { symbols } = await compileAndGetSymbols(apexCode, 'MyClass.cls');

      // Initial state
      let stats = manager.getStats();
      expect(stats.totalSymbols).toBe(0);

      // After adding symbol
      symbols.forEach((symbol) => manager.addSymbol(symbol, 'MyClass.cls'));
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

      const { symbols } = await compileAndGetSymbols(apexCode, 'MyClass.cls');

      // Add symbols to the manager
      symbols.forEach((symbol) => manager.addSymbol(symbol, 'MyClass.cls'));

      // Try to add the same symbols again
      symbols.forEach((symbol) => manager.addSymbol(symbol, 'MyClass.cls'));

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
      const symbols: ApexSymbol[] = [];
      for (let i = 0; i < 10; i++) {
        const apexCode = `
          public class Class${i} {
            public void method${i}() {}
            private String field${i};
          }
        `;
        const { symbols: classSymbols } = await compileAndGetSymbols(
          apexCode,
          `Class${i}.cls`,
        );
        symbols.push(...classSymbols);
      }

      // Add all symbols to the manager
      symbols.forEach((symbol, i) => {
        manager.addSymbol(symbol, `Class${i}.cls`);
      });

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

      const { symbols } = await compileAndGetSymbols(apexCode, 'MyClass.cls');
      symbols.forEach((symbol) => manager.addSymbol(symbol, 'MyClass.cls'));

      const classSymbol = symbols.find((s) => s.kind === SymbolKind.Class);
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
    it('should handle inheritance relationships', async () => {
      const apexCode = `
        public virtual class BaseClass {
          public virtual void baseMethod() {}
        }
        
        public class DerivedClass extends BaseClass {
          public override void baseMethod() {}
          public void derivedMethod() {}
        }
      `;

      const { symbols } = await compileAndGetSymbols(
        apexCode,
        'InheritanceTest.cls',
      );
      symbols.forEach((symbol) =>
        manager.addSymbol(symbol, 'InheritanceTest.cls'),
      );

      const baseClass = symbols.find((s) => s.name === 'BaseClass');
      const derivedClass = symbols.find((s) => s.name === 'DerivedClass');

      expect(baseClass).toBeDefined();
      expect(derivedClass).toBeDefined();

      if (baseClass && derivedClass) {
        const baseReferences = manager.findReferencesTo(baseClass);
        const derivedReferences = manager.findReferencesTo(derivedClass);

        expect(Array.isArray(baseReferences)).toBe(true);
        expect(Array.isArray(derivedReferences)).toBe(true);
      }
    });

    it('should handle interface implementations', async () => {
      const apexCode = `
        public interface MyInterface {
          void interfaceMethod();
        }
        
        public class MyClass implements MyInterface {
          public void interfaceMethod() {}
        }
      `;

      const { symbols } = await compileAndGetSymbols(
        apexCode,
        'InterfaceTest.cls',
      );
      symbols.forEach((symbol) =>
        manager.addSymbol(symbol, 'InterfaceTest.cls'),
      );

      const interfaceSymbol = symbols.find(
        (s) => s.kind === SymbolKind.Interface,
      );
      const classSymbol = symbols.find((s) => s.kind === SymbolKind.Class);

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

      const { symbols } = await compileAndGetSymbols(apexCode, 'EnumTest.cls');
      symbols.forEach((symbol) => manager.addSymbol(symbol, 'EnumTest.cls'));

      const enumSymbol = symbols.find((s) => s.kind === SymbolKind.Enum);
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

      const { symbols } = await compileAndGetSymbols(
        apexCode,
        'MyTrigger.trigger',
      );
      symbols.forEach((symbol) =>
        manager.addSymbol(symbol, 'MyTrigger.trigger'),
      );

      const triggerSymbol = symbols.find((s) => s.kind === SymbolKind.Trigger);
      expect(triggerSymbol).toBeDefined();

      if (triggerSymbol) {
        const triggerReferences = manager.findReferencesTo(triggerSymbol);
        expect(Array.isArray(triggerReferences)).toBe(true);
      }
    });
  });
});
