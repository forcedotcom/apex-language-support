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
} from '../../src/utils/FQNUtils.js';
import { SymbolKind, SymbolVisibility } from '../../src/types/symbol.js';

describe('FQN Utilities', () => {
  describe('calculateFQN', () => {
    it('should calculate simple FQN for a standalone symbol', () => {
      const symbol = {
        name: 'MyClass',
        kind: SymbolKind.Class,
        modifiers: { visibility: SymbolVisibility.Public },
        parent: null,
      };

      expect(calculateFQN(symbol)).toBe('MyClass');
    });

    it('should calculate FQN for a symbol with parent', () => {
      const parentSymbol = {
        name: 'ParentClass',
        kind: SymbolKind.Class,
        modifiers: { visibility: SymbolVisibility.Public },
        parent: null,
      };

      const childSymbol = {
        name: 'ChildMethod',
        kind: SymbolKind.Method,
        modifiers: { visibility: SymbolVisibility.Public },
        parent: parentSymbol,
      };

      expect(calculateFQN(childSymbol)).toBe('ParentClass.ChildMethod');
    });

    it('should calculate FQN with nested hierarchy', () => {
      const grandparentSymbol = {
        name: 'OuterClass',
        kind: SymbolKind.Class,
        modifiers: { visibility: SymbolVisibility.Public },
        parent: null,
      };

      const parentSymbol = {
        name: 'InnerClass',
        kind: SymbolKind.Class,
        modifiers: { visibility: SymbolVisibility.Private },
        parent: grandparentSymbol,
      };

      const childSymbol = {
        name: 'myMethod',
        kind: SymbolKind.Method,
        modifiers: { visibility: SymbolVisibility.Private },
        parent: parentSymbol,
      };

      expect(calculateFQN(childSymbol)).toBe('OuterClass.InnerClass.myMethod');
    });

    it('should not apply namespace if already inherited from parent', () => {
      const parentWithNamespace = {
        name: 'ParentClass',
        kind: SymbolKind.Class,
        modifiers: { visibility: SymbolVisibility.Public },
        namespace: 'ExistingNamespace',
        parent: null,
      };

      const childSymbol = {
        name: 'ChildMethod',
        kind: SymbolKind.Method,
        modifiers: { visibility: SymbolVisibility.Public },
        parent: parentWithNamespace,
      };

      expect(
        calculateFQN(childSymbol, { defaultNamespace: 'NewNamespace' }),
      ).toBe('ParentClass.ChildMethod');
      expect(childSymbol.namespace).toBe('ExistingNamespace');
    });

    it('should apply namespace to top-level symbols when provided', () => {
      const symbol = {
        name: 'MyClass',
        kind: SymbolKind.Class,
        modifiers: { visibility: SymbolVisibility.Public },
        parent: null,
      };

      expect(calculateFQN(symbol, { defaultNamespace: 'MyNamespace' })).toBe(
        'MyNamespace.MyClass',
      );
      expect(symbol.namespace).toBe('MyNamespace');
    });

    it('should not apply namespace to child symbols even when provided', () => {
      const parentSymbol = {
        name: 'ParentClass',
        kind: SymbolKind.Class,
        modifiers: { visibility: SymbolVisibility.Public },
        parent: null,
      };

      const childSymbol = {
        name: 'ChildMethod',
        kind: SymbolKind.Method,
        modifiers: { visibility: SymbolVisibility.Public },
        parent: parentSymbol,
      };

      expect(
        calculateFQN(parentSymbol, { defaultNamespace: 'MyNamespace' }),
      ).toBe('MyNamespace.ParentClass');
      expect(
        calculateFQN(childSymbol, { defaultNamespace: 'MyNamespace' }),
      ).toBe('ParentClass.ChildMethod');

      // Child should inherit namespace from parent
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
});
