/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  TypeInfo,
  createPrimitiveType,
  createCollectionType,
  createArrayType,
  createMapType,
} from '../../src/types/typeInfo';

describe('TypeInfo', () => {
  describe('createPrimitiveType', () => {
    test('should create a primitive type', () => {
      const intType = createPrimitiveType('Integer');

      expect(intType.name).toBe('Integer');
      expect(intType.isArray).toBe(false);
      expect(intType.isCollection).toBe(false);
      expect(intType.isPrimitive).toBe(true);
      expect(intType.originalTypeString).toBe('Integer');
      expect(intType.getNamespace()).toBeNull();
    });
  });

  describe('createCollectionType', () => {
    test('should create a collection type without type parameters', () => {
      const listType = createCollectionType('List');

      expect(listType.name).toBe('List');
      expect(listType.isArray).toBe(false);
      expect(listType.isCollection).toBe(true);
      expect(listType.isPrimitive).toBe(false);
      expect(listType.originalTypeString).toBe('List');
      expect(listType.getNamespace()).toBeNull();
    });

    test('should create a collection type with type parameters', () => {
      const stringType = createPrimitiveType('String');
      const listType = createCollectionType('List', [stringType]);

      expect(listType.name).toBe('List');
      expect(listType.isArray).toBe(false);
      expect(listType.isCollection).toBe(true);
      expect(listType.isPrimitive).toBe(false);
      expect(listType.typeParameters).toHaveLength(1);
      expect(listType.typeParameters?.[0].name).toBe('String');
      expect(listType.originalTypeString).toBe('List<String>');
      expect(listType.getNamespace()).toBeNull();
    });

    test('should create a collection type with multiple type parameters', () => {
      const stringType = createPrimitiveType('String');
      const intType = createPrimitiveType('Integer');
      const setType = createCollectionType('Set', [stringType, intType]);

      expect(setType.name).toBe('Set');
      expect(setType.typeParameters).toHaveLength(2);
      expect(setType.originalTypeString).toBe('Set<String, Integer>');
    });
  });

  describe('createArrayType', () => {
    test('should create an array type from a primitive', () => {
      const stringType = createPrimitiveType('String');
      const arrayType = createArrayType(stringType);

      expect(arrayType.name).toBe('String[]');
      expect(arrayType.isArray).toBe(true);
      expect(arrayType.isCollection).toBe(false);
      expect(arrayType.isPrimitive).toBe(false);
      expect(arrayType.typeParameters).toHaveLength(1);
      expect(arrayType.typeParameters?.[0].name).toBe('String');
      expect(arrayType.originalTypeString).toBe('String[]');
      expect(arrayType.getNamespace()).toBeNull();
    });

    test('should create an array type from a collection', () => {
      const stringType = createPrimitiveType('String');
      const listType = createCollectionType('List', [stringType]);
      const arrayType = createArrayType(listType);

      expect(arrayType.name).toBe('List[]');
      expect(arrayType.isArray).toBe(true);
      expect(arrayType.originalTypeString).toBe('List<String>[]');
    });
  });

  describe('createMapType', () => {
    test('should create a map type', () => {
      const stringType = createPrimitiveType('String');
      const intType = createPrimitiveType('Integer');
      const mapType = createMapType(stringType, intType);

      expect(mapType.name).toBe('Map');
      expect(mapType.isArray).toBe(false);
      expect(mapType.isCollection).toBe(true);
      expect(mapType.isPrimitive).toBe(false);
      expect(mapType.keyType).toBeDefined();
      expect(mapType.keyType?.name).toBe('String');
      expect(mapType.typeParameters).toHaveLength(1);
      expect(mapType.typeParameters?.[0].name).toBe('Integer');
      expect(mapType.originalTypeString).toBe('Map<String, Integer>');
      expect(mapType.getNamespace()).toBeNull();
    });

    test('should create a map with complex types', () => {
      const stringType = createPrimitiveType('String');
      const listType = createCollectionType('List', [stringType]);
      const mapType = createMapType(stringType, listType);

      expect(mapType.keyType?.name).toBe('String');
      expect(mapType.typeParameters?.[0].name).toBe('List');
      expect(mapType.originalTypeString).toBe('Map<String, List<String>>');
    });
  });
});
