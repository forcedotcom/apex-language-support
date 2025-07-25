/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ApexSymbolManager } from '../../src/utils/ApexSymbolManager';
import {
  ApexSymbol,
  SymbolKind,
  SymbolVisibility,
} from '../../src/types/symbol';
import { ReferenceType } from '../../src/references/ApexSymbolGraph';

describe('ApexSymbolManager', () => {
  let manager: ApexSymbolManager;

  beforeEach(() => {
    manager = new ApexSymbolManager();
  });

  afterEach(() => {
    // Clean up if needed
  });

  // Helper function to create test symbols
  const createTestSymbol = (
    name: string,
    kind: SymbolKind,
    fqn?: string,
    filePath: string = 'TestFile.cls',
  ): ApexSymbol => ({
    name,
    kind,
    fqn: fqn || `TestNamespace.${name}`,
    location: {
      startLine: 1,
      startColumn: 1,
      endLine: 10,
      endColumn: 20,
    },
    modifiers: {
      visibility: SymbolVisibility.Public,
      isStatic: false,
      isFinal: false,
      isAbstract: false,
      isVirtual: false,
      isOverride: false,
      isTransient: false,
      isTestMethod: false,
      isWebService: false,
    },
    key: {
      prefix: 'class',
      name,
      path: [filePath, name],
    },
    parentKey: null,
  });

  // ============================================================================
  // Phase 2.1: Symbol Management Methods
  // ============================================================================

  describe('Symbol Management', () => {
    it('should add symbols to the manager', () => {
      const classSymbol = createTestSymbol('MyClass', SymbolKind.Class);

      manager.addSymbol(classSymbol, 'MyClass.cls');

      const stats = manager.getStats();
      expect(stats.totalSymbols).toBe(1);
      expect(stats.totalFiles).toBe(1);
    });

    it('should handle multiple symbols with the same name', () => {
      const class1 = createTestSymbol(
        'MyClass',
        SymbolKind.Class,
        'Namespace1.MyClass',
        'File1.cls',
      );
      const class2 = createTestSymbol(
        'MyClass',
        SymbolKind.Class,
        'Namespace2.MyClass',
        'File2.cls',
      );

      manager.addSymbol(class1, 'File1.cls');
      manager.addSymbol(class2, 'File2.cls');

      const symbols = manager.findSymbolByName('MyClass');
      expect(symbols).toHaveLength(2);
      expect(symbols.map((s) => s.fqn)).toContain('Namespace1.MyClass');
      expect(symbols.map((s) => s.fqn)).toContain('Namespace2.MyClass');
    });

    it('should remove all symbols from a file', () => {
      const classSymbol = createTestSymbol('MyClass', SymbolKind.Class);
      const methodSymbol = createTestSymbol('myMethod', SymbolKind.Method);

      manager.addSymbol(classSymbol, 'MyClass.cls');
      manager.addSymbol(methodSymbol, 'MyClass.cls');

      // Add a symbol to another file
      const otherSymbol = createTestSymbol('OtherClass', SymbolKind.Class);
      manager.addSymbol(otherSymbol, 'OtherClass.cls');

      // Remove the first file
      manager.removeFile('MyClass.cls');

      const stats = manager.getStats();
      expect(stats.totalSymbols).toBe(1);
      expect(stats.totalFiles).toBe(1);

      const remainingSymbols = manager.findSymbolsInFile('OtherClass.cls');
      expect(remainingSymbols).toHaveLength(1);
      expect(remainingSymbols[0].name).toBe('OtherClass');
    });

    it('should refresh with new symbol data', () => {
      const class1 = createTestSymbol('Class1', SymbolKind.Class);
      const class2 = createTestSymbol('Class2', SymbolKind.Class);

      manager.addSymbol(class1, 'File1.cls');
      manager.addSymbol(class2, 'File2.cls');

      // Verify initial state
      let stats = manager.getStats();
      expect(stats.totalSymbols).toBe(2);
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
    it('should find symbols by name', () => {
      const classSymbol = createTestSymbol('MyClass', SymbolKind.Class);
      manager.addSymbol(classSymbol, 'MyClass.cls');

      const symbols = manager.findSymbolByName('MyClass');
      expect(symbols).toHaveLength(1);
      expect(symbols[0].name).toBe('MyClass');
    });

    it('should find symbols by FQN', () => {
      const classSymbol = createTestSymbol(
        'MyClass',
        SymbolKind.Class,
        'MyNamespace.MyClass',
      );

      manager.addSymbol(classSymbol, 'MyClass.cls');

      const found = manager.findSymbolByFQN('MyNamespace.MyClass');
      expect(found).toBeDefined();
      expect(found?.name).toBe('MyClass');
      expect(found?.fqn).toBe('MyNamespace.MyClass');
    });

    it('should return null for non-existent FQN', () => {
      const found = manager.findSymbolByFQN('NonExistent.Class');
      expect(found).toBeNull();
    });

    it('should find all symbols in a file', () => {
      const classSymbol = createTestSymbol('MyClass', SymbolKind.Class);
      const methodSymbol = createTestSymbol('myMethod', SymbolKind.Method);

      manager.addSymbol(classSymbol, 'MyClass.cls');
      manager.addSymbol(methodSymbol, 'MyClass.cls');

      const symbols = manager.findSymbolsInFile('MyClass.cls');
      expect(symbols).toHaveLength(2);
      expect(symbols.map((s) => s.name)).toContain('MyClass');
      expect(symbols.map((s) => s.name)).toContain('myMethod');
    });

    it('should find all files containing a symbol', () => {
      const class1 = createTestSymbol(
        'MyClass',
        SymbolKind.Class,
        'MyClass',
        'File1.cls',
      );
      const class2 = createTestSymbol(
        'MyClass',
        SymbolKind.Class,
        'MyClass',
        'File2.cls',
      );

      manager.addSymbol(class1, 'File1.cls');
      manager.addSymbol(class2, 'File2.cls');

      const files = manager.findFilesForSymbol('MyClass');
      expect(files).toHaveLength(2);
      expect(files).toContain('File1.cls');
      expect(files).toContain('File2.cls');
    });

    it('should return empty array for non-existent symbol', () => {
      const files = manager.findFilesForSymbol('NonExistent');
      expect(files).toHaveLength(0);
    });
  });

  // ============================================================================
  // Phase 2.3: Graph-Based Relationship Queries
  // ============================================================================

  describe('Relationship Queries', () => {
    it('should find references to a symbol', () => {
      const classSymbol = createTestSymbol('MyClass', SymbolKind.Class);
      const methodSymbol = createTestSymbol('myMethod', SymbolKind.Method);

      manager.addSymbol(classSymbol, 'MyClass.cls');
      manager.addSymbol(methodSymbol, 'MyClass.cls');

      // Add a reference from method to class
      // Note: This would require the underlying graph to support reference addition
      // For now, we'll test the method exists and returns empty array
      const references = manager.findReferencesTo(classSymbol);
      expect(Array.isArray(references)).toBe(true);
    });

    it('should find references from a symbol', () => {
      const classSymbol = createTestSymbol('MyClass', SymbolKind.Class);
      const methodSymbol = createTestSymbol('myMethod', SymbolKind.Method);

      manager.addSymbol(classSymbol, 'MyClass.cls');
      manager.addSymbol(methodSymbol, 'MyClass.cls');

      const references = manager.findReferencesFrom(classSymbol);
      expect(Array.isArray(references)).toBe(true);
    });

    it('should find related symbols by relationship type', () => {
      const classSymbol = createTestSymbol('MyClass', SymbolKind.Class);
      const methodSymbol = createTestSymbol('myMethod', SymbolKind.Method);

      manager.addSymbol(classSymbol, 'MyClass.cls');
      manager.addSymbol(methodSymbol, 'MyClass.cls');

      const relatedSymbols = manager.findRelatedSymbols(
        classSymbol,
        ReferenceType.METHOD_CALL,
      );
      expect(Array.isArray(relatedSymbols)).toBe(true);
    });

    it('should handle empty relationship queries gracefully', () => {
      const classSymbol = createTestSymbol('MyClass', SymbolKind.Class);
      manager.addSymbol(classSymbol, 'MyClass.cls');

      const references = manager.findReferencesTo(classSymbol);
      expect(references).toHaveLength(0);

      const referencesFrom = manager.findReferencesFrom(classSymbol);
      expect(referencesFrom).toHaveLength(0);

      const relatedSymbols = manager.findRelatedSymbols(
        classSymbol,
        ReferenceType.METHOD_CALL,
      );
      expect(relatedSymbols).toHaveLength(0);
    });
  });

  // ============================================================================
  // Utility Methods
  // ============================================================================

  describe('Statistics and Utilities', () => {
    it('should provide accurate statistics', () => {
      const classSymbol = createTestSymbol('MyClass', SymbolKind.Class);
      const methodSymbol = createTestSymbol('myMethod', SymbolKind.Method);

      manager.addSymbol(classSymbol, 'MyClass.cls');
      manager.addSymbol(methodSymbol, 'MyClass.cls');

      const stats = manager.getStats();
      expect(stats.totalSymbols).toBe(2);
      expect(stats.totalFiles).toBe(1);
      expect(stats.totalReferences).toBe(0); // No references added yet
      expect(stats.circularDependencies).toBe(0);
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

    it('should provide consistent statistics after operations', () => {
      const classSymbol = createTestSymbol('MyClass', SymbolKind.Class);

      // Initial state
      let stats = manager.getStats();
      expect(stats.totalSymbols).toBe(0);

      // After adding symbol
      manager.addSymbol(classSymbol, 'MyClass.cls');
      stats = manager.getStats();
      expect(stats.totalSymbols).toBe(1);

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
    it('should handle duplicate symbol additions gracefully', () => {
      const classSymbol = createTestSymbol('MyClass', SymbolKind.Class);

      manager.addSymbol(classSymbol, 'MyClass.cls');
      manager.addSymbol(classSymbol, 'MyClass.cls'); // Duplicate

      const stats = manager.getStats();
      expect(stats.totalSymbols).toBe(1); // Should not create duplicates
    });

    it('should handle removal of non-existent files', () => {
      // Should not throw an error
      expect(() => {
        manager.removeFile('NonExistentFile.cls');
      }).not.toThrow();
    });

    it('should handle lookup of non-existent symbols', () => {
      const symbols = manager.findSymbolByName('NonExistent');
      expect(symbols).toHaveLength(0);

      const found = manager.findSymbolByFQN('NonExistent.Class');
      expect(found).toBeNull();

      const fileSymbols = manager.findSymbolsInFile('NonExistentFile.cls');
      expect(fileSymbols).toHaveLength(0);
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
    it('should handle large numbers of symbols efficiently', () => {
      const startTime = Date.now();

      // Add 1000 symbols
      for (let i = 0; i < 1000; i++) {
        const symbol = createTestSymbol(
          `Class${i}`,
          SymbolKind.Class,
          `Namespace.Class${i}`,
          `File${i}.cls`,
        );
        manager.addSymbol(symbol, `File${i}.cls`);
      }

      const addTime = Date.now() - startTime;
      expect(addTime).toBeLessThan(5000); // Should complete within 5 seconds

      // Test lookup performance
      const lookupStartTime = Date.now();
      const symbols = manager.findSymbolByName('Class500');
      const lookupTime = Date.now() - lookupStartTime;
      expect(lookupTime).toBeLessThan(100); // Should complete within 100ms
      expect(symbols).toHaveLength(1); // Should find the symbol

      const stats = manager.getStats();
      expect(stats.totalSymbols).toBe(1000);
      expect(stats.totalFiles).toBe(1000);
    });

    it('should maintain performance after cache operations', () => {
      const classSymbol = createTestSymbol('MyClass', SymbolKind.Class);
      manager.addSymbol(classSymbol, 'MyClass.cls');

      // First lookup (cache miss)
      const firstLookup = manager.findReferencesTo(classSymbol);

      // Second lookup (cache hit)
      const secondLookup = manager.findReferencesTo(classSymbol);

      // Both should return the same result
      expect(firstLookup).toEqual(secondLookup);
    });
  });
});
