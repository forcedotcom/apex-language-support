/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  createTypeInfo,
  createArrayTypeInfo,
  createCollectionTypeInfo,
  createMapTypeInfo,
  needsResolution,
  markForResolution,
} from '../../src/utils/TypeInfoFactory';
import { TypeInfo } from '../../src/types/typeInfo';
import { Namespaces } from '../../src/namespace/namespaces';

describe('TypeInfoFactory', () => {
  describe('createTypeInfo', () => {
    describe('qualified type names', () => {
      it('should handle System namespace types', () => {
        const typeInfo = createTypeInfo('System.String');

        expect(typeInfo.name).toBe('String');
        expect(typeInfo.namespace).toBe(Namespaces.SYSTEM);
        expect(typeInfo.originalTypeString).toBe('System.String');
        expect(typeInfo.needsNamespaceResolution).toBeUndefined();
        expect(typeInfo.getNamespace()).toBe(Namespaces.SYSTEM);
      });

      it('should handle Schema namespace types', () => {
        const typeInfo = createTypeInfo('Schema.Account');

        expect(typeInfo.name).toBe('Account');
        expect(typeInfo.namespace).toBe(Namespaces.SCHEMA);
        expect(typeInfo.originalTypeString).toBe('Schema.Account');
        expect(typeInfo.needsNamespaceResolution).toBeUndefined();
      });

      it('should handle Apex namespace types', () => {
        const typeInfo = createTypeInfo('Apex.Debug');

        expect(typeInfo.name).toBe('Debug');
        expect(typeInfo.namespace).toBeDefined();
        expect(typeInfo.namespace?.global).toBe('Apex');
        expect(typeInfo.namespace?.module).toBe('');
        expect(typeInfo.originalTypeString).toBe('Apex.Debug');
      });

      it('should handle custom namespace types', () => {
        const typeInfo = createTypeInfo('MyNamespace.MyClass');

        expect(typeInfo.name).toBe('MyClass');
        expect(typeInfo.namespace).toBeDefined();
        expect(typeInfo.namespace?.global).toBe('MyNamespace');
        expect(typeInfo.namespace?.module).toBe('');
        expect(typeInfo.originalTypeString).toBe('MyNamespace.MyClass');
        expect(typeInfo.needsNamespaceResolution).toBeUndefined();
      });

      it('should handle additional built-in namespace types', () => {
        const typeInfo = createTypeInfo('Auth.Session');

        expect(typeInfo.name).toBe('Session');
        expect(typeInfo.namespace).toBeDefined();
        expect(typeInfo.namespace?.global).toBe('Auth');
        expect(typeInfo.namespace?.module).toBe('');
        expect(typeInfo.originalTypeString).toBe('Auth.Session');
        expect(typeInfo.needsNamespaceResolution).toBeUndefined();
      });

      it('should handle more built-in namespace types', () => {
        const typeInfo = createTypeInfo('Cache.Org');

        expect(typeInfo.name).toBe('Org');
        expect(typeInfo.namespace).toBeDefined();
        expect(typeInfo.namespace?.global).toBe('Cache');
        expect(typeInfo.namespace?.module).toBe('');
        expect(typeInfo.originalTypeString).toBe('Cache.Org');
        expect(typeInfo.needsNamespaceResolution).toBeUndefined();
      });
    });

    describe('simple type names', () => {
      it('should handle built-in primitive types', () => {
        const typeInfo = createTypeInfo('String');

        expect(typeInfo.name).toBe('String');
        expect(typeInfo.isPrimitive).toBe(true);
        expect(typeInfo.namespace).toBeUndefined();
        expect(typeInfo.originalTypeString).toBe('String');
        expect(typeInfo.needsNamespaceResolution).toBeUndefined();
        expect(typeInfo.getNamespace()).toBeNull();
      });

      it('should handle built-in wrapper types', () => {
        const typeInfo = createTypeInfo('Integer');

        expect(typeInfo.name).toBe('Integer');
        expect(typeInfo.isPrimitive).toBe(true);
        expect(typeInfo.namespace).toBeUndefined();
        expect(typeInfo.needsNamespaceResolution).toBeUndefined();
      });

      it('should handle built-in scalar types', () => {
        const typeInfo = createTypeInfo('void');

        expect(typeInfo.name).toBe('void');
        expect(typeInfo.isPrimitive).toBe(true);
        expect(typeInfo.namespace).toBeUndefined();
        expect(typeInfo.needsNamespaceResolution).toBeUndefined();
      });

      it('should mark user-defined types for resolution', () => {
        const typeInfo = createTypeInfo('MyClass');

        expect(typeInfo.name).toBe('MyClass');
        expect(typeInfo.isPrimitive).toBe(false);
        expect(typeInfo.namespace).toBeUndefined();
        expect(typeInfo.needsNamespaceResolution).toBe(true);
        expect(typeInfo.getNamespace()).toBeNull();
      });

      it('should mark SObject types for resolution', () => {
        const typeInfo = createTypeInfo('MyCustomObject__c');

        expect(typeInfo.name).toBe('MyCustomObject__c');
        expect(typeInfo.isPrimitive).toBe(false);
        expect(typeInfo.needsNamespaceResolution).toBe(true);
      });
    });
  });

  describe('createArrayTypeInfo', () => {
    it('should create array type from primitive element', () => {
      const elementType = createTypeInfo('String');
      const arrayType = createArrayTypeInfo(elementType);

      expect(arrayType.name).toBe('String[]');
      expect(arrayType.isArray).toBe(true);
      expect(arrayType.isCollection).toBe(false);
      expect(arrayType.originalTypeString).toBe('String[]');
      expect(arrayType.typeParameters).toEqual([elementType]);
    });

    it('should create array type from qualified element', () => {
      const elementType = createTypeInfo('System.String');
      const arrayType = createArrayTypeInfo(elementType);

      expect(arrayType.name).toBe('String[]');
      expect(arrayType.isArray).toBe(true);
      expect(arrayType.namespace).toBe(Namespaces.SYSTEM);
      expect(arrayType.originalTypeString).toBe('System.String[]');
    });

    it('should preserve resolution flag for user-defined types', () => {
      const elementType = createTypeInfo('MyClass');
      const arrayType = createArrayTypeInfo(elementType);

      expect(arrayType.name).toBe('MyClass[]');
      expect(arrayType.isArray).toBe(true);
      expect(arrayType.needsNamespaceResolution).toBe(true);
    });
  });

  describe('createCollectionTypeInfo', () => {
    it('should create List type', () => {
      const elementType = createTypeInfo('String');
      const listType = createCollectionTypeInfo('List', [elementType]);

      expect(listType.name).toBe('List');
      expect(listType.isArray).toBe(false);
      expect(listType.isCollection).toBe(true);
      expect(listType.originalTypeString).toBe('List<String>');
      expect(listType.typeParameters).toEqual([elementType]);
    });

    it('should create Set type', () => {
      const elementType = createTypeInfo('Integer');
      const setType = createCollectionTypeInfo('Set', [elementType]);

      expect(setType.name).toBe('Set');
      expect(setType.isCollection).toBe(true);
      expect(setType.originalTypeString).toBe('Set<Integer>');
    });

    it('should handle empty type parameters', () => {
      const listType = createCollectionTypeInfo('List');

      expect(listType.name).toBe('List');
      expect(listType.originalTypeString).toBe('List');
      expect(listType.typeParameters).toEqual([]);
    });
  });

  describe('createMapTypeInfo', () => {
    it('should create Map type with key and value types', () => {
      const keyType = createTypeInfo('String');
      const valueType = createTypeInfo('Integer');
      const mapType = createMapTypeInfo(keyType, valueType);

      expect(mapType.name).toBe('Map');
      expect(mapType.isCollection).toBe(true);
      expect(mapType.keyType).toBe(keyType);
      expect(mapType.typeParameters).toEqual([valueType]);
      expect(mapType.originalTypeString).toBe('Map<String, Integer>');
    });
  });

  describe('utility methods', () => {
    it('should check if type needs resolution', () => {
      const resolvedType = createTypeInfo('String');
      const unresolvedType = createTypeInfo('MyClass');

      expect(needsResolution(resolvedType)).toBe(false);
      expect(needsResolution(unresolvedType)).toBe(true);
    });

    it('should mark type for resolution', () => {
      const typeInfo = createTypeInfo('String');
      const markedType = markForResolution(typeInfo);

      expect(markedType.needsNamespaceResolution).toBe(true);
      expect(markedType.name).toBe('String'); // Other properties preserved
    });
  });
});
