/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  ApexSymbol,
  SymbolKey,
  SymbolKind,
  SymbolVisibility,
  generateUnifiedId,
  keyToString,
  createFromSymbol,
  areEquivalent,
  getUnifiedId,
} from '../../src/types/symbol';
import { ApexSymbolManager } from '../../src/symbols/ApexSymbolManager';

/**
 * These tests validate the unified key system that combines SymbolKey and getSymbolId()
 */
describe('Phase 6.5.2: Symbol Key System Unification', () => {
  let manager: ApexSymbolManager;

  beforeEach(() => {
    manager = new ApexSymbolManager();
  });

  describe('SymbolKeyUtils', () => {
    it('should generate unified IDs from SymbolKey', () => {
      const key: SymbolKey = {
        prefix: 'class',
        name: 'TestClass',
        path: ['file', 'TestClass'],
        kind: SymbolKind.Class,
        fqn: 'TestClass',
      };

      const unifiedId = generateUnifiedId(key);
      expect(unifiedId).toBe('file://unknown:file.TestClass:class:TestClass');
    });

    it('should generate unified IDs without FQN', () => {
      const key: SymbolKey = {
        prefix: 'method',
        name: 'testMethod',
        path: ['file', 'TestClass', 'testMethod'],
        kind: SymbolKind.Method,
      };

      const unifiedId = generateUnifiedId(key);
      expect(unifiedId).toBe(
        'file://unknown:file.TestClass.testMethod:method:testMethod',
      );
    });

    it('should include file path in unified ID when provided', () => {
      const key: SymbolKey = {
        prefix: 'class',
        name: 'TestClass',
        path: ['file', 'TestClass'],
        kind: SymbolKind.Class,
        fqn: 'TestClass',
      };

      const unifiedId = generateUnifiedId(key, 'TestFile.cls');
      expect(unifiedId).toBe('file://TestFile.cls:file.TestClass:class:TestClass');
    });

    it('should convert SymbolKey to string for legacy compatibility', () => {
      const key: SymbolKey = {
        prefix: 'class',
        name: 'TestClass',
        path: ['file', 'TestClass'],
      };

      const stringKey = keyToString(key);
      expect(stringKey).toBe('class:file.TestClass');
    });

    it('should create SymbolKey from ApexSymbol with unified ID', () => {
      const symbol: ApexSymbol = {
        id: 'TestFile.cls:TestClass',
        name: 'TestClass',
        kind: SymbolKind.Class,
        location: {
          symbolRange: {
            startLine: 1,
            startColumn: 1,
            endLine: 1,
            endColumn: 10,
          },
          identifierRange: {
            startLine: 1,
            startColumn: 1,
            endLine: 1,
            endColumn: 10,
          },
        },
        fileUri: 'file:///TestFile.cls',
        parentId: null,
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
          isBuiltIn: false,
        },
        key: {
          prefix: 'class',
          name: 'TestClass',
          path: ['file', 'TestClass'],
        },
        parentKey: null,
        fqn: 'TestClass',
        _modifierFlags: 0,
        _isLoaded: true,
      };

      const unifiedKey = createFromSymbol(symbol, 'TestFile.cls');

      expect(unifiedKey.prefix).toBe('class');
      expect(unifiedKey.name).toBe('TestClass');
      expect(unifiedKey.path).toEqual(['file', 'TestClass']);
      expect(unifiedKey.kind).toBe(SymbolKind.Class);
      expect(unifiedKey.fqn).toBe('TestClass');
      expect(unifiedKey.fileUri).toBe('TestFile.cls');
      expect(unifiedKey.unifiedId).toBe(
        'file://TestFile.cls:file.TestClass:class:TestClass',
      );
    });

    it('should check if two SymbolKeys are equivalent', () => {
      const key1: SymbolKey = {
        prefix: 'class',
        name: 'TestClass',
        path: ['file', 'TestClass'],
        unifiedId: 'TestClass:TestFile.cls',
      };

      const key2: SymbolKey = {
        prefix: 'class',
        name: 'TestClass',
        path: ['file', 'TestClass'],
        unifiedId: 'TestClass:TestFile.cls',
      };

      const key3: SymbolKey = {
        prefix: 'class',
        name: 'DifferentClass',
        path: ['file', 'DifferentClass'],
        unifiedId: 'DifferentClass:TestFile.cls',
      };

      expect(areEquivalent(key1, key2)).toBe(true);
      expect(areEquivalent(key1, key3)).toBe(false);
    });

    it('should check if two SymbolKeys are equivalent without unified IDs', () => {
      const key1: SymbolKey = {
        prefix: 'class',
        name: 'TestClass',
        path: ['file', 'TestClass'],
      };

      const key2: SymbolKey = {
        prefix: 'class',
        name: 'TestClass',
        path: ['file', 'TestClass'],
      };

      const key3: SymbolKey = {
        prefix: 'class',
        name: 'DifferentClass',
        path: ['file', 'DifferentClass'],
      };

      expect(areEquivalent(key1, key2)).toBe(true);
      expect(areEquivalent(key1, key3)).toBe(false);
    });

    it('should get unified ID from SymbolKey, generating if needed', () => {
      const key: SymbolKey = {
        prefix: 'class',
        name: 'TestClass',
        path: ['file', 'TestClass'],
        kind: SymbolKind.Class,
        fqn: 'TestClass',
      };

      const unifiedId = getUnifiedId(key, 'TestFile.cls');
      expect(unifiedId).toBe('file://TestFile.cls:file.TestClass:class:TestClass');

      // Should return cached value
      const cachedId = getUnifiedId(key, 'TestFile.cls');
      expect(cachedId).toBe('file://TestFile.cls:file.TestClass:class:TestClass');
    });
  });

  describe('ApexSymbolManager Integration', () => {
    it('should use unified key system in getSymbolId', () => {
      const symbol: ApexSymbol = {
        id: 'file:///TestFile.cls:TestClass',
        name: 'TestClass',
        kind: SymbolKind.Class,
        location: {
          symbolRange: {
            startLine: 1,
            startColumn: 1,
            endLine: 1,
            endColumn: 10,
          },
          identifierRange: {
            startLine: 1,
            startColumn: 1,
            endLine: 1,
            endColumn: 10,
          },
        },
        fileUri: 'file:///TestFile.cls',
        parentId: null,
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
          isBuiltIn: false,
        },
        key: {
          prefix: 'class',
          name: 'TestClass',
          path: ['file', 'TestClass'],
          fqn: 'TestClass',
        },
        parentKey: null,
        fqn: 'TestClass',
        _modifierFlags: 0,
        _isLoaded: true,
      };

      // Add symbol to manager
      manager.addSymbol(symbol, 'TestFile.cls');

      // Verify unified ID was generated and cached
      expect(symbol.key.unifiedId).toBe(
        'file://TestFile.cls:file.TestClass:class:TestClass',
      );
    });

    it('should maintain backward compatibility with existing SymbolKey usage', () => {
      const symbol: ApexSymbol = {
        id: 'file:///TestFile.cls:TestClass',
        name: 'TestClass',
        kind: SymbolKind.Class,
        location: {
          symbolRange: {
            startLine: 1,
            startColumn: 1,
            endLine: 1,
            endColumn: 10,
          },
          identifierRange: {
            startLine: 1,
            startColumn: 1,
            endLine: 1,
            endColumn: 10,
          },
        },
        fileUri: 'file:///TestFile.cls',
        parentId: null,
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
          isBuiltIn: false,
        },
        key: {
          prefix: 'class',
          name: 'TestClass',
          path: ['file', 'TestClass'],
        },
        parentKey: null,
        _modifierFlags: 0,
        _isLoaded: true,
      };

      // Add symbol to manager
      manager.addSymbol(symbol, 'TestFile.cls');

      // Verify legacy key properties are preserved
      expect(symbol.key.prefix).toBe('class');
      expect(symbol.key.name).toBe('TestClass');
      expect(symbol.key.path).toEqual(['file', 'TestClass']);

      // Verify unified ID was added
      expect(symbol.key.unifiedId).toBeDefined();
      expect(symbol.key.kind).toBe(SymbolKind.Class);
    });

    it('should handle symbols without FQN correctly', () => {
      const symbol: ApexSymbol = {
        id: 'file:///TestFile.cls:testMethod',
        name: 'testMethod',
        kind: SymbolKind.Method,
        location: {
          symbolRange: {
            startLine: 5,
            startColumn: 1,
            endLine: 5,
            endColumn: 20,
          },
          identifierRange: {
            startLine: 5,
            startColumn: 1,
            endLine: 5,
            endColumn: 20,
          },
        },
        fileUri: 'file:///TestFile.cls',
        parentId: null,
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
          isBuiltIn: false,
        },
        key: {
          prefix: 'method',
          name: 'testMethod',
          path: ['file', 'TestClass', 'testMethod'],
        },
        parentKey: null,
        _modifierFlags: 0,
        _isLoaded: true,
      };

      // Add symbol to manager
      manager.addSymbol(symbol, 'TestFile.cls');

      // Verify unified ID was generated without FQN
      expect(symbol.key.unifiedId).toBe(
        'file://TestFile.cls:file.TestClass.testMethod:method:testMethod',
      );
    });
  });

  describe('Performance and Consistency', () => {
    it('should generate consistent unified IDs for same symbols', () => {
      const symbol1: ApexSymbol = {
        id: 'TestFile.cls:TestClass',
        name: 'TestClass',
        kind: SymbolKind.Class,
        location: {
          symbolRange: {
            startLine: 1,
            startColumn: 1,
            endLine: 1,
            endColumn: 10,
          },
          identifierRange: {
            startLine: 1,
            startColumn: 1,
            endLine: 1,
            endColumn: 10,
          },
        },
        fileUri: 'file:///TestFile.cls',
        parentId: null,
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
          isBuiltIn: false,
        },
        key: {
          prefix: 'class',
          name: 'TestClass',
          path: ['file', 'TestClass'],
          fqn: 'TestClass',
        },
        parentKey: null,
        fqn: 'TestClass',
        _modifierFlags: 0,
        _isLoaded: true,
      };

      const symbol2: ApexSymbol = {
        id: 'TestFile.cls:TestClass',
        name: 'TestClass',
        kind: SymbolKind.Class,
        location: {
          symbolRange: {
            startLine: 1,
            startColumn: 1,
            endLine: 1,
            endColumn: 10,
          },
          identifierRange: {
            startLine: 1,
            startColumn: 1,
            endLine: 1,
            endColumn: 10,
          },
        },
        fileUri: 'file:///TestFile.cls',
        parentId: null,
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
          isBuiltIn: false,
        },
        key: {
          prefix: 'class',
          name: 'TestClass',
          path: ['file', 'TestClass'],
          fqn: 'TestClass',
        },
        parentKey: null,
        fqn: 'TestClass',
        _modifierFlags: 0,
        _isLoaded: true,
      };

      const key1 = createFromSymbol(symbol1, 'TestFile.cls');
      const key2 = createFromSymbol(symbol2, 'TestFile.cls');

      expect(key1.unifiedId).toBe(key2.unifiedId);
      expect(areEquivalent(key1, key2)).toBe(true);
    });

    it('should handle large numbers of symbols efficiently', () => {
      const symbols: ApexSymbol[] = [];
      const startTime = Date.now();

      // Create 1000 symbols
      for (let i = 0; i < 1000; i++) {
        const symbol: ApexSymbol = {
          id: `TestFile.cls:TestClass${i}`,
          name: `TestClass${i}`,
          kind: SymbolKind.Class,
          location: {
            symbolRange: {
              startLine: 1,
              startColumn: 1,
              endLine: 1,
              endColumn: 10,
            },
            identifierRange: {
              startLine: 1,
              startColumn: 1,
              endLine: 1,
              endColumn: 10,
            },
          },
          fileUri: 'file:///TestFile.cls',
          parentId: null,
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
            isBuiltIn: false,
          },
          key: {
            prefix: 'class',
            name: `TestClass${i}`,
            path: ['file', `TestClass${i}`],
            fqn: `TestClass${i}`,
          },
          parentKey: null,
          fqn: `TestClass${i}`,
          _modifierFlags: 0,
          _isLoaded: true,
        };

        symbols.push(symbol);
      }

      // Generate unified keys for all symbols
      const unifiedKeys = symbols.map((symbol) =>
        createFromSymbol(symbol, 'TestFile.cls'),
      );

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete in reasonable time (less than 100ms)
      expect(duration).toBeLessThan(100);

      // Verify all keys have unique unified IDs
      const unifiedIds = unifiedKeys.map((key) => key.unifiedId);
      const uniqueIds = new Set(unifiedIds);
      expect(uniqueIds.size).toBe(1000);
    });
  });
});
