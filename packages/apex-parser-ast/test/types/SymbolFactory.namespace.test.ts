/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  SymbolFactory,
  SymbolKind,
  SymbolModifiers,
  SymbolVisibility,
} from '../../src/types/symbol';
import { Namespaces } from '../../src/namespace/NamespaceUtils';

// Mock data for testing
const mockLocation = {
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
};

const mockModifiers: SymbolModifiers = {
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
};

describe('SymbolFactory with Namespace Support', () => {
  describe('createFullSymbolWithNamespace', () => {
    it('should create symbol with explicit namespace', () => {
      const namespace = Namespaces.create('MyNamespace');
      const symbol = SymbolFactory.createFullSymbolWithNamespace(
        'TestClass',
        SymbolKind.Class,
        mockLocation,
        'test.cls',
        mockModifiers,
        null,
        undefined,
        namespace,
      );

      expect(symbol.namespace).toBe(namespace);
      expect(symbol.fqn).toBe('mynamespace.testclass');
    });

    it('should handle null namespace gracefully', () => {
      const symbol = SymbolFactory.createFullSymbolWithNamespace(
        'TestClass',
        SymbolKind.Class,
        mockLocation,
        'test.cls',
        mockModifiers,
        null,
        undefined,
        null,
      );

      expect(symbol.namespace).toBeNull();
      expect(symbol.fqn).toBeUndefined();
    });

    it('should maintain backward compatibility with existing methods', () => {
      const oldSymbol = SymbolFactory.createFullSymbol(
        'TestClass',
        SymbolKind.Class,
        mockLocation,
        'test.cls',
        mockModifiers,
      );

      expect(oldSymbol.namespace).toBeNull();
      expect(oldSymbol.fqn).toBeUndefined();
    });

    it('should handle complex namespace scenarios', () => {
      const namespace = Namespaces.create('Global', 'Module');
      const symbol = SymbolFactory.createFullSymbolWithNamespace(
        'TestClass',
        SymbolKind.Class,
        mockLocation,
        'test.cls',
        mockModifiers,
        null,
        undefined,
        namespace,
      );

      expect(symbol.namespace?.toString()).toBe('Global__Module');
      expect(symbol.fqn).toBe('global__module.testclass');
    });

    it('should generate correct symbol key with namespace', () => {
      const namespace = Namespaces.create('MyNamespace');
      const symbol = SymbolFactory.createFullSymbolWithNamespace(
        'TestClass',
        SymbolKind.Class,
        mockLocation,
        'test.cls',
        mockModifiers,
        null,
        undefined,
        namespace,
      );

      expect(symbol.key.fqn).toBe('mynamespace.testclass');
      expect(symbol.key.prefix).toBe(SymbolKind.Class);
      expect(symbol.key.name).toBe('TestClass');
    });

    it('should handle different symbol kinds with namespace', () => {
      const namespace = Namespaces.create('MyNamespace');

      const classSymbol = SymbolFactory.createFullSymbolWithNamespace(
        'TestClass',
        SymbolKind.Class,
        mockLocation,
        'test.cls',
        mockModifiers,
        null,
        undefined,
        namespace,
      );

      const interfaceSymbol = SymbolFactory.createFullSymbolWithNamespace(
        'TestInterface',
        SymbolKind.Interface,
        mockLocation,
        'test.cls',
        mockModifiers,
        null,
        undefined,
        namespace,
      );

      expect(classSymbol.kind).toBe(SymbolKind.Class);
      expect(interfaceSymbol.kind).toBe(SymbolKind.Interface);
      expect(classSymbol.namespace).toBe(namespace);
      expect(interfaceSymbol.namespace).toBe(namespace);
    });

    it('should handle parent relationships with namespace', () => {
      const namespace = Namespaces.create('MyNamespace');
      const parentId = 'parent-123';

      const symbol = SymbolFactory.createFullSymbolWithNamespace(
        'ChildClass',
        SymbolKind.Class,
        mockLocation,
        'test.cls',
        mockModifiers,
        parentId,
        undefined,
        namespace,
      );

      expect(symbol.parentId).toBe(parentId);
      // parentKey removed - use parentId for parent resolution
      expect(symbol.namespace).toBe(namespace);
    });

    it('should handle type data with namespace', () => {
      const namespace = Namespaces.create('MyNamespace');
      const typeData = { interfaces: ['Interface1', 'Interface2'] };

      const symbol = SymbolFactory.createFullSymbolWithNamespace(
        'TestClass',
        SymbolKind.Class,
        mockLocation,
        'test.cls',
        mockModifiers,
        null,
        typeData,
        namespace,
      );

      expect(symbol._typeData).toEqual(typeData);
      expect(symbol.namespace).toBe(namespace);
      expect(symbol._isLoaded).toBe(true);
    });

    it('should handle annotations with namespace', () => {
      const namespace = Namespaces.create('MyNamespace');
      const annotations = [
        {
          name: 'TestAnnotation',
          parameters: [],
          location: mockLocation,
        },
      ];

      const symbol = SymbolFactory.createFullSymbolWithNamespace(
        'TestClass',
        SymbolKind.Class,
        mockLocation,
        'test.cls',
        mockModifiers,
        null,
        undefined,
        namespace,
        annotations,
      );

      expect(symbol.annotations).toEqual(annotations);
      expect(symbol.namespace).toBe(namespace);
    });

    it('should handle location with both symbol and identifier ranges with namespace', () => {
      const namespace = Namespaces.create('MyNamespace');
      const locationWithIdentifierRange = {
        symbolRange: {
          startLine: 1,
          startColumn: 0,
          endLine: 3,
          endColumn: 20,
        },
        identifierRange: {
          startLine: 2,
          startColumn: 5,
          endLine: 2,
          endColumn: 15,
        },
      };

      const symbol = SymbolFactory.createFullSymbolWithNamespace(
        'TestClass',
        SymbolKind.Class,
        locationWithIdentifierRange,
        'test.cls',
        mockModifiers,
        null,
        undefined,
        namespace,
        undefined,
      );

      expect(symbol.location).toEqual(locationWithIdentifierRange);
      expect(symbol.location.identifierRange).toEqual(
        locationWithIdentifierRange.identifierRange,
      );
      expect(symbol.namespace).toBe(namespace);
    });
  });
});
