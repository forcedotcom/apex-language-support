/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { CollectionTypeValidator } from '../../../src/semantics/validation/CollectionTypeValidator';
import type {
  ValidationScope,
  TypeInfo,
} from '../../../src/semantics/validation/CollectionTypeValidator';

describe('CollectionTypeValidator', () => {
  const createMockScope = (): ValidationScope => ({
    errors: {
      addError: jest.fn(),
      addWarning: jest.fn(),
    },
    settings: {
      collectMultipleErrors: true,
      breakOnFirstError: false,
      enableWarnings: true,
      maxErrors: 100,
      version: 58,
    },
    symbolTable: {} as any,
    currentContext: {
      currentType: null,
      currentMethod: null,
      isStaticContext: false,
      currentNamespace: null,
      compilationContext: {
        namespace: null,
        version: 58,
        isTrusted: true,
        sourceType: 'FILE',
        referencingType: null,
        enclosingTypes: [],
        parentTypes: [],
        isStaticContext: false,
      },
    },
    compilationContext: {
      namespace: null,
      version: 58,
      isTrusted: true,
      sourceType: 'FILE',
      referencingType: null,
      enclosingTypes: [],
      parentTypes: [],
      isStaticContext: false,
    },
  });

  const createMockTypeInfo = (
    name: string,
    isPrimitive = false,
    isSObject = false,
    isCollection = false,
    elementType?: TypeInfo,
    keyType?: TypeInfo,
    valueType?: TypeInfo,
  ): TypeInfo => ({
    name,
    namespace: null,
    visibility: 'Public' as any,
    isPrimitive,
    isSObject,
    isCollection,
    elementType,
    keyType,
    valueType,
  });

  const createMockSObjectType = (name: string): TypeInfo =>
    createMockTypeInfo(name, false, true);

  const createMockCollectionType = (
    name: string,
    elementType: TypeInfo,
  ): TypeInfo => createMockTypeInfo(name, false, false, true, elementType);

  const createMockMapType = (
    keyType: TypeInfo,
    valueType: TypeInfo,
  ): TypeInfo =>
    createMockTypeInfo(
      'Map',
      false,
      false,
      true,
      undefined,
      keyType,
      valueType,
    );

  describe('validateCollectionType', () => {
    describe('Non-Collection Types', () => {
      it('should return valid for non-collection types', () => {
        const typeInfo = createMockTypeInfo('String', true);

        const result = CollectionTypeValidator.validateCollectionType(
          typeInfo,
          createMockScope(),
        );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should return valid for primitive types', () => {
        const typeInfo = createMockTypeInfo('Integer', true);

        const result = CollectionTypeValidator.validateCollectionType(
          typeInfo,
          createMockScope(),
        );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('List Type Validation', () => {
      it('should validate List with valid element type', () => {
        const elementType = createMockTypeInfo('String', true);
        const listType = createMockCollectionType('List', elementType);

        const result = CollectionTypeValidator.validateCollectionType(
          listType,
          createMockScope(),
        );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate List with primitive element type', () => {
        const elementType = createMockTypeInfo('Integer', true);
        const listType = createMockCollectionType('List', elementType);

        const result = CollectionTypeValidator.validateCollectionType(
          listType,
          createMockScope(),
        );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate List with SObject element type', () => {
        const elementType = createMockSObjectType('Account');
        const listType = createMockCollectionType('List', elementType);

        const result = CollectionTypeValidator.validateCollectionType(
          listType,
          createMockScope(),
        );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject List with missing element type', () => {
        const listType = createMockTypeInfo('List', false, false, true);

        const result = CollectionTypeValidator.validateCollectionType(
          listType,
          createMockScope(),
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('invalid.collection.element.type');
      });

      it('should reject List with void element type', () => {
        const elementType = createMockTypeInfo('void');
        const listType = createMockCollectionType('List', elementType);

        const result = CollectionTypeValidator.validateCollectionType(
          listType,
          createMockScope(),
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('invalid.collection.element.type');
      });

      it('should reject List with invisible element type', () => {
        const elementType = createMockTypeInfo('PrivateClass');
        elementType.visibility = 'Private' as any;
        elementType.namespace = { name: 'OtherNamespace' };

        const listType = createMockCollectionType('List', elementType);
        const scope = createMockScope();
        scope.currentContext.currentNamespace = 'CurrentNamespace';

        const result = CollectionTypeValidator.validateCollectionType(
          listType,
          scope,
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('type.not.visible');
      });
    });

    describe('Set Type Validation', () => {
      it('should validate Set with valid element type', () => {
        const elementType = createMockTypeInfo('Integer', true);
        const setType = createMockCollectionType('Set', elementType);

        const result = CollectionTypeValidator.validateCollectionType(
          setType,
          createMockScope(),
        );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate Set with SObject element type', () => {
        const elementType = createMockSObjectType('Contact');
        const setType = createMockCollectionType('Set', elementType);

        const result = CollectionTypeValidator.validateCollectionType(
          setType,
          createMockScope(),
        );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject Set with missing element type', () => {
        const setType = createMockTypeInfo('Set', false, false, true);

        const result = CollectionTypeValidator.validateCollectionType(
          setType,
          createMockScope(),
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('invalid.collection.element.type');
      });

      it('should reject Set with void element type', () => {
        const elementType = createMockTypeInfo('void');
        const setType = createMockCollectionType('Set', elementType);

        const result = CollectionTypeValidator.validateCollectionType(
          setType,
          createMockScope(),
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('invalid.collection.element.type');
      });
    });

    describe('Map Type Validation', () => {
      it('should validate Map with valid key and value types', () => {
        const keyType = createMockTypeInfo('String', true);
        const valueType = createMockTypeInfo('Integer', true);
        const mapType = createMockMapType(keyType, valueType);

        const result = CollectionTypeValidator.validateCollectionType(
          mapType,
          createMockScope(),
        );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate Map with primitive key and value types', () => {
        const keyType = createMockTypeInfo('Integer', true);
        const valueType = createMockTypeInfo('String', true);
        const mapType = createMockMapType(keyType, valueType);

        const result = CollectionTypeValidator.validateCollectionType(
          mapType,
          createMockScope(),
        );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject Map with missing key type', () => {
        const valueType = createMockTypeInfo('String', true);
        const mapType = createMockTypeInfo(
          'Map',
          false,
          false,
          true,
          undefined,
          undefined,
          valueType,
        );

        const result = CollectionTypeValidator.validateCollectionType(
          mapType,
          createMockScope(),
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('invalid.map.key.type');
      });

      it('should reject Map with missing value type', () => {
        const keyType = createMockTypeInfo('String', true);
        const mapType = createMockTypeInfo(
          'Map',
          false,
          false,
          true,
          undefined,
          keyType,
          undefined,
        );

        const result = CollectionTypeValidator.validateCollectionType(
          mapType,
          createMockScope(),
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('invalid.map.value.type');
      });

      it('should reject Map with void key type', () => {
        const keyType = createMockTypeInfo('void');
        const valueType = createMockTypeInfo('String', true);
        const mapType = createMockMapType(keyType, valueType);

        const result = CollectionTypeValidator.validateCollectionType(
          mapType,
          createMockScope(),
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('invalid.map.key.type');
      });

      it('should reject Map with void value type', () => {
        const keyType = createMockTypeInfo('String', true);
        const valueType = createMockTypeInfo('void');
        const mapType = createMockMapType(keyType, valueType);

        const result = CollectionTypeValidator.validateCollectionType(
          mapType,
          createMockScope(),
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('invalid.map.value.type');
      });

      it('should reject Map with invisible key type', () => {
        const keyType = createMockTypeInfo('PrivateClass');
        keyType.visibility = 'Private' as any;
        keyType.namespace = { name: 'OtherNamespace' };

        const valueType = createMockTypeInfo('String', true);
        const mapType = createMockMapType(keyType, valueType);
        const scope = createMockScope();
        scope.currentContext.currentNamespace = 'CurrentNamespace';

        const result = CollectionTypeValidator.validateCollectionType(
          mapType,
          scope,
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('type.not.visible');
      });

      it('should reject Map with invisible value type', () => {
        const keyType = createMockTypeInfo('String', true);
        const valueType = createMockTypeInfo('PrivateClass');
        valueType.visibility = 'Private' as any;
        valueType.namespace = { name: 'OtherNamespace' };

        const mapType = createMockMapType(keyType, valueType);
        const scope = createMockScope();
        scope.currentContext.currentNamespace = 'CurrentNamespace';

        const result = CollectionTypeValidator.validateCollectionType(
          mapType,
          scope,
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('type.not.visible');
      });
    });

    describe('SObject Collection Validation', () => {
      it('should validate List with standard SObject type', () => {
        const elementType = createMockSObjectType('Account');
        const listType = createMockCollectionType('List', elementType);

        const result = CollectionTypeValidator.validateCollectionType(
          listType,
          createMockScope(),
        );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate List with custom SObject type', () => {
        const elementType = createMockSObjectType('CustomObject__c');
        const listType = createMockCollectionType('List', elementType);

        const result = CollectionTypeValidator.validateCollectionType(
          listType,
          createMockScope(),
        );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate Set with standard SObject type', () => {
        const elementType = createMockSObjectType('Contact');
        const setType = createMockCollectionType('Set', elementType);

        const result = CollectionTypeValidator.validateCollectionType(
          setType,
          createMockScope(),
        );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate Set with custom SObject type', () => {
        const elementType = createMockSObjectType('CustomObject__c');
        const setType = createMockCollectionType('Set', elementType);

        const result = CollectionTypeValidator.validateCollectionType(
          setType,
          createMockScope(),
        );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject List with invalid SObject type', () => {
        const elementType = createMockSObjectType('InvalidObject');
        const listType = createMockCollectionType('List', elementType);

        const result = CollectionTypeValidator.validateCollectionType(
          listType,
          createMockScope(),
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('invalid.sobject.type');
      });

      it('should reject Set with invalid SObject type', () => {
        const elementType = createMockSObjectType('InvalidObject');
        const setType = createMockCollectionType('Set', elementType);

        const result = CollectionTypeValidator.validateCollectionType(
          setType,
          createMockScope(),
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('invalid.sobject.type');
      });
    });

    describe('SObject Map Validation', () => {
      it('should validate Map<Id, SObject>', () => {
        const keyType = createMockTypeInfo('Id', true);
        const valueType = createMockSObjectType('Account');
        const mapType = createMockMapType(keyType, valueType);

        const result = CollectionTypeValidator.validateCollectionType(
          mapType,
          createMockScope(),
        );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate Map<String, SObject>', () => {
        const keyType = createMockTypeInfo('String', true);
        const valueType = createMockSObjectType('Contact');
        const mapType = createMockMapType(keyType, valueType);

        const result = CollectionTypeValidator.validateCollectionType(
          mapType,
          createMockScope(),
        );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate Map<SObject, T>', () => {
        const keyType = createMockSObjectType('Account');
        const valueType = createMockTypeInfo('String', true);
        const mapType = createMockMapType(keyType, valueType);

        const result = CollectionTypeValidator.validateCollectionType(
          mapType,
          createMockScope(),
        );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject Map with invalid SObject key type', () => {
        const keyType = createMockSObjectType('InvalidObject');
        const valueType = createMockTypeInfo('String', true);
        const mapType = createMockMapType(keyType, valueType);

        const result = CollectionTypeValidator.validateCollectionType(
          mapType,
          createMockScope(),
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('invalid.sobject.type');
      });

      it('should reject Map with invalid SObject value type', () => {
        const keyType = createMockTypeInfo('Id', true);
        const valueType = createMockSObjectType('InvalidObject');
        const mapType = createMockMapType(keyType, valueType);

        const result = CollectionTypeValidator.validateCollectionType(
          mapType,
          createMockScope(),
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('invalid.sobject.type');
      });

      it('should reject Map with invalid key type for SObject value', () => {
        const keyType = createMockTypeInfo('Integer', true);
        const valueType = createMockSObjectType('Account');
        const mapType = createMockMapType(keyType, valueType);

        const result = CollectionTypeValidator.validateCollectionType(
          mapType,
          createMockScope(),
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('invalid.sobject.map');
      });
    });

    describe('Custom SObject Type Validation', () => {
      it('should validate custom SObject with __c suffix', () => {
        const elementType = createMockSObjectType('CustomObject__c');
        const listType = createMockCollectionType('List', elementType);

        const result = CollectionTypeValidator.validateCollectionType(
          listType,
          createMockScope(),
        );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate custom SObject with __kav suffix', () => {
        const elementType = createMockSObjectType('CustomArticle__kav');
        const listType = createMockCollectionType('List', elementType);

        const result = CollectionTypeValidator.validateCollectionType(
          listType,
          createMockScope(),
        );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate custom SObject with __ka suffix', () => {
        const elementType = createMockSObjectType('CustomArticle__ka');
        const listType = createMockCollectionType('List', elementType);

        const result = CollectionTypeValidator.validateCollectionType(
          listType,
          createMockScope(),
        );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate custom SObject with __x suffix', () => {
        const elementType = createMockSObjectType('CustomExternal__x');
        const listType = createMockCollectionType('List', elementType);

        const result = CollectionTypeValidator.validateCollectionType(
          listType,
          createMockScope(),
        );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject custom SObject with invalid suffix', () => {
        const elementType = createMockSObjectType('CustomObject__invalid');
        const listType = createMockCollectionType('List', elementType);

        const result = CollectionTypeValidator.validateCollectionType(
          listType,
          createMockScope(),
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('invalid.sobject.type');
      });
    });

    describe('Standard SObject Type Validation', () => {
      it('should validate Account SObject type', () => {
        const elementType = createMockSObjectType('Account');
        const listType = createMockCollectionType('List', elementType);

        const result = CollectionTypeValidator.validateCollectionType(
          listType,
          createMockScope(),
        );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate Contact SObject type', () => {
        const elementType = createMockSObjectType('Contact');
        const listType = createMockCollectionType('List', elementType);

        const result = CollectionTypeValidator.validateCollectionType(
          listType,
          createMockScope(),
        );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate Lead SObject type', () => {
        const elementType = createMockSObjectType('Lead');
        const listType = createMockCollectionType('List', elementType);

        const result = CollectionTypeValidator.validateCollectionType(
          listType,
          createMockScope(),
        );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate Opportunity SObject type', () => {
        const elementType = createMockSObjectType('Opportunity');
        const listType = createMockCollectionType('List', elementType);

        const result = CollectionTypeValidator.validateCollectionType(
          listType,
          createMockScope(),
        );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate Case SObject type', () => {
        const elementType = createMockSObjectType('Case');
        const listType = createMockCollectionType('List', elementType);

        const result = CollectionTypeValidator.validateCollectionType(
          listType,
          createMockScope(),
        );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate User SObject type', () => {
        const elementType = createMockSObjectType('User');
        const listType = createMockCollectionType('List', elementType);

        const result = CollectionTypeValidator.validateCollectionType(
          listType,
          createMockScope(),
        );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });
  });
});
