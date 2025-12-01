/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  calculateFQN,
  extractNamespace,
  isBuiltInFQN,
  getNamespaceFromFQN,
  isGlobalSymbol,
  isBlockScope,
} from '../../src/utils/FQNUtils';
import {
  SymbolKind,
  SymbolVisibility,
  ApexSymbol,
} from '../../src/types/symbol';
import {
  initializeResourceLoaderForTests,
  resetResourceLoader,
} from '../helpers/testHelpers';

describe('FQN Utilities', () => {
  beforeAll(async () => {
    // Initialize ResourceLoader with StandardApexLibrary.zip for standard library resolution
    await initializeResourceLoaderForTests({ loadMode: 'lazy' });
  });

  afterAll(() => {
    resetResourceLoader();
  });
  // Map to store symbols by ID for getParent lookup
  const symbolMap = new Map<string, ApexSymbol>();

  const createTestSymbol = (
    name: string,
    kind: SymbolKind,
    parent: ApexSymbol | null = null,
  ): ApexSymbol => {
    const id = `test://${name}`;
    const symbol: ApexSymbol = {
      name,
      kind,
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
      id,
      fileUri: 'test://',
      parentId: parent ? parent.id : null,
      key: {
        prefix: kind,
        name,
        path: parent ? [...parent.key.path, name] : [name],
      },
      _isLoaded: false,
    };
    symbolMap.set(id, symbol);
    return symbol;
  };

  const getParent = (parentId: string): ApexSymbol | null =>
    symbolMap.get(parentId) || null;

  describe('calculateFQN', () => {
    it('should calculate simple FQN for a standalone symbol', () => {
      const symbol = createTestSymbol('TestClass', SymbolKind.Class);
      expect(calculateFQN(symbol)).toBe('TestClass');
    });

    it('should calculate FQN for a symbol with parent', () => {
      const parent = createTestSymbol('ParentClass', SymbolKind.Class);
      const child = createTestSymbol('ChildMethod', SymbolKind.Method, parent);
      expect(calculateFQN(child, undefined, getParent)).toBe(
        'ParentClass.ChildMethod',
      );
    });

    it('should calculate FQN for a symbol with multiple parents', () => {
      const grandparent = createTestSymbol(
        'GrandparentClass',
        SymbolKind.Class,
      );
      const parent = createTestSymbol(
        'ParentClass',
        SymbolKind.Class,
        grandparent,
      );
      const child = createTestSymbol('ChildMethod', SymbolKind.Method, parent);
      expect(calculateFQN(child, undefined, getParent)).toBe(
        'GrandparentClass.ParentClass.ChildMethod',
      );
    });

    it('should handle namespace in FQN', () => {
      const symbol = createTestSymbol('MyClass', SymbolKind.Class);
      symbol.namespace = 'TestNamespace';
      expect(calculateFQN(symbol)).toBe('TestNamespace.MyClass');
    });

    it('should calculate FQN for a symbol with parent', () => {
      const parentSymbol = createTestSymbol('ParentClass', SymbolKind.Class);
      const childSymbol = createTestSymbol(
        'ChildMethod',
        SymbolKind.Method,
        parentSymbol,
      );
      expect(calculateFQN(childSymbol, undefined, getParent)).toBe(
        'ParentClass.ChildMethod',
      );
    });

    it('should calculate FQN with nested hierarchy', () => {
      const grandparentSymbol = createTestSymbol(
        'OuterClass',
        SymbolKind.Class,
      );
      const parentSymbol = createTestSymbol(
        'InnerClass',
        SymbolKind.Class,
        grandparentSymbol,
      );
      const childSymbol = createTestSymbol(
        'myMethod',
        SymbolKind.Method,
        parentSymbol,
      );
      expect(calculateFQN(childSymbol, undefined, getParent)).toBe(
        'OuterClass.InnerClass.myMethod',
      );
    });

    it.skip('should not apply namespace if already inherited from parent', () => {
      const parentWithNamespace = createTestSymbol(
        'ParentClass',
        SymbolKind.Class,
      );
      parentWithNamespace.namespace = 'ExistingNamespace';
      const childSymbol = createTestSymbol(
        'ChildMethod',
        SymbolKind.Method,
        parentWithNamespace,
      );
      expect(
        calculateFQN(
          childSymbol,
          { defaultNamespace: 'NewNamespace' },
          getParent,
        ),
      ).toBe('ParentClass.ChildMethod');
      expect(childSymbol.namespace).toBe('ExistingNamespace');
    });

    it('should apply namespace to top-level symbols when provided', () => {
      const symbol = createTestSymbol('MyClass', SymbolKind.Class);
      expect(calculateFQN(symbol, { defaultNamespace: 'MyNamespace' })).toBe(
        'MyNamespace.MyClass',
      );
      expect(symbol.namespace).toBe('MyNamespace');
    });

    it.skip('should not apply namespace to child symbols even when provided', () => {
      const parentSymbol = createTestSymbol('ParentClass', SymbolKind.Class);
      const childSymbol = createTestSymbol(
        'ChildMethod',
        SymbolKind.Method,
        parentSymbol,
      );
      expect(
        calculateFQN(
          parentSymbol,
          { defaultNamespace: 'MyNamespace' },
          getParent,
        ),
      ).toBe('MyNamespace.ParentClass');
      expect(
        calculateFQN(
          childSymbol,
          { defaultNamespace: 'MyNamespace' },
          getParent,
        ),
      ).toBe('ParentClass.ChildMethod');
      expect(childSymbol.namespace).toBe('MyNamespace');
    });
  });

  describe('extractNamespace', () => {
    it('should extract built-in namespace from qualified name', () => {
      expect(extractNamespace('System.String')).toBe('System');
    });

    it('should return empty string if no namespace is present', () => {
      expect(extractNamespace('MyClass')).toBe('');
    });

    it('should return default namespace if provided and no namespace is in name', () => {
      expect(extractNamespace('MyClass', 'DefaultNamespace')).toBe(
        'DefaultNamespace',
      );
    });

    it('should prioritize built-in namespace over default namespace', () => {
      expect(extractNamespace('System.String', 'DefaultNamespace')).toBe(
        'System',
      );
    });
  });

  describe('isBuiltInFQN', () => {
    it('should identify built-in namespace types', () => {
      expect(isBuiltInFQN('System.String')).toBe(true);
      expect(isBuiltInFQN('Database.QueryLocator')).toBe(true);
    });

    it('should identify standalone built-in namespaces', () => {
      expect(isBuiltInFQN('System')).toBe(true);
      expect(isBuiltInFQN('Database')).toBe(true);
    });

    it('should return false for custom namespaces', () => {
      expect(isBuiltInFQN('MyNamespace.MyClass')).toBe(false);
      expect(isBuiltInFQN('Custom.Type')).toBe(false);
    });
  });

  describe('getNamespaceFromFQN', () => {
    it('should extract namespace from FQN', () => {
      expect(getNamespaceFromFQN('MyNamespace.MyClass')).toBe('MyNamespace');
      expect(getNamespaceFromFQN('System.String')).toBe('System');
    });

    it('should return undefined if no namespace is present', () => {
      expect(getNamespaceFromFQN('MyClass')).toBeUndefined();
    });
  });

  describe('isGlobalSymbol', () => {
    it('should identify global symbols', () => {
      expect(isGlobalSymbol({ visibility: 'global' })).toBe(true);
    });

    it('should return false for non-global symbols', () => {
      expect(isGlobalSymbol({ visibility: 'public' })).toBe(false);
      expect(isGlobalSymbol({ visibility: 'private' })).toBe(false);
      expect(isGlobalSymbol({})).toBe(false);
    });

    it('should handle null and undefined values', () => {
      expect(isGlobalSymbol(null)).toBe(false);
      expect(isGlobalSymbol(undefined)).toBe(false);
    });
  });

  describe('isBlockScope', () => {
    it('should identify block symbols', () => {
      const blockSymbol = createTestSymbol('block1', SymbolKind.Block);
      expect(isBlockScope(blockSymbol)).toBe(true);
    });

    it('should return false for non-block symbols', () => {
      const classSymbol = createTestSymbol('MyClass', SymbolKind.Class);
      expect(isBlockScope(classSymbol)).toBe(false);

      const methodSymbol = createTestSymbol('myMethod', SymbolKind.Method);
      expect(isBlockScope(methodSymbol)).toBe(false);
    });

    it('should handle null and undefined values', () => {
      expect(isBlockScope(null)).toBe(false);
      expect(isBlockScope(undefined)).toBe(false);
    });

    it('should exclude block symbols from FQN calculation', () => {
      const classSymbol = createTestSymbol('MyClass', SymbolKind.Class);
      const blockSymbol = createTestSymbol('block1', SymbolKind.Block, classSymbol);
      const methodSymbol = createTestSymbol('myMethod', SymbolKind.Method, blockSymbol);

      // FQN should skip the block symbol and go directly from class to method
      expect(calculateFQN(methodSymbol, undefined, getParent)).toBe(
        'MyClass.myMethod',
      );
    });
  });
});
