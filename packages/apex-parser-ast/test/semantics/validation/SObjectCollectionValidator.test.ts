/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { SObjectCollectionValidator } from '../../../src/semantics/validation/SObjectCollectionValidator';
import { ValidationScope } from '../../../src/semantics/validation/ValidationResult';
import { TypeInfo } from '../../../src/semantics/validation/TypeValidator';

describe('SObjectCollectionValidator', () => {
  const createMockScope = (): ValidationScope => ({
    currentClass: 'TestClass',
    currentMethod: 'testMethod',
    isStatic: false,
  });

  const createMockSObjectType = (name: string): TypeInfo => ({
    name,
    isSObject: true,
    isCollection: false,
    isPrimitive: false,
    elementType: undefined,
    keyType: undefined,
    valueType: undefined,
  });

  const createMockCollectionType = (
    collectionName: string,
    elementType: TypeInfo,
  ): TypeInfo => ({
    name: collectionName,
    isSObject: false,
    isCollection: true,
    isPrimitive: false,
    elementType,
    keyType: undefined,
    valueType: undefined,
  });

  const createMockMapType = (
    keyType: TypeInfo,
    valueType: TypeInfo,
  ): TypeInfo => ({
    name: 'Map',
    isSObject: false,
    isCollection: true,
    isPrimitive: false,
    elementType: undefined,
    keyType,
    valueType,
  });

  const createMockTypeInfo = (name: string, isSObject = false): TypeInfo => ({
    name,
    isSObject,
    isCollection: false,
    isPrimitive: false,
    elementType: undefined,
    keyType: undefined,
    valueType: undefined,
  });

  describe('validateSObjectCollectionOperation', () => {
    describe('Valid SObject Collection Operations', () => {
      it('should validate List<SObject> add operation', () => {
        const listType = createMockCollectionType(
          'List',
          createMockSObjectType('Account'),
        );

        const result =
          SObjectCollectionValidator.validateSObjectCollectionOperation(
            listType,
            'add',
            createMockScope(),
          );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate Set<SObject> add operation', () => {
        const setType = createMockCollectionType(
          'Set',
          createMockSObjectType('Contact'),
        );

        const result =
          SObjectCollectionValidator.validateSObjectCollectionOperation(
            setType,
            'add',
            createMockScope(),
          );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate Map<Id, SObject> put operation', () => {
        const mapType = createMockMapType(
          createMockTypeInfo('Id', false),
          createMockSObjectType('Lead'),
        );

        const result =
          SObjectCollectionValidator.validateSObjectCollectionOperation(
            mapType,
            'put',
            createMockScope(),
          );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate Map<String, SObject> put operation', () => {
        const mapType = createMockMapType(
          createMockTypeInfo('String', false),
          createMockSObjectType('Opportunity'),
        );

        const result =
          SObjectCollectionValidator.validateSObjectCollectionOperation(
            mapType,
            'put',
            createMockScope(),
          );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate List<SObject> addAll operation', () => {
        const listType = createMockCollectionType(
          'List',
          createMockSObjectType('Case'),
        );

        const result =
          SObjectCollectionValidator.validateSObjectCollectionOperation(
            listType,
            'addAll',
            createMockScope(),
          );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate Set<SObject> contains operation', () => {
        const setType = createMockCollectionType(
          'Set',
          createMockSObjectType('User'),
        );

        const result =
          SObjectCollectionValidator.validateSObjectCollectionOperation(
            setType,
            'contains',
            createMockScope(),
          );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate Map<Id, SObject> get operation', () => {
        const mapType = createMockMapType(
          createMockTypeInfo('Id', false),
          createMockSObjectType('Profile'),
        );

        const result =
          SObjectCollectionValidator.validateSObjectCollectionOperation(
            mapType,
            'get',
            createMockScope(),
          );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate List<SObject> remove operation', () => {
        const listType = createMockCollectionType(
          'List',
          createMockSObjectType('Group'),
        );

        const result =
          SObjectCollectionValidator.validateSObjectCollectionOperation(
            listType,
            'remove',
            createMockScope(),
          );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate Set<SObject> size operation', () => {
        const setType = createMockCollectionType(
          'Set',
          createMockSObjectType('Queue'),
        );

        const result =
          SObjectCollectionValidator.validateSObjectCollectionOperation(
            setType,
            'size',
            createMockScope(),
          );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate Map<Id, SObject> isEmpty operation', () => {
        const mapType = createMockMapType(
          createMockTypeInfo('Id', false),
          createMockSObjectType('Role'),
        );

        const result =
          SObjectCollectionValidator.validateSObjectCollectionOperation(
            mapType,
            'isEmpty',
            createMockScope(),
          );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('Invalid SObject Collection Operations', () => {
      it('should reject operation on non-collection type', () => {
        const nonCollectionType = createMockSObjectType('Account');

        const result =
          SObjectCollectionValidator.validateSObjectCollectionOperation(
            nonCollectionType,
            'add',
            createMockScope(),
          );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('invalid.sobject.collection');
      });

      it('should reject operation on collection with non-SObject elements', () => {
        const listType = createMockCollectionType(
          'List',
          createMockTypeInfo('String', false),
        );

        const result =
          SObjectCollectionValidator.validateSObjectCollectionOperation(
            listType,
            'add',
            createMockScope(),
          );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('invalid.sobject.collection');
      });

      it('should reject invalid operation on List<SObject>', () => {
        const listType = createMockCollectionType(
          'List',
          createMockSObjectType('Account'),
        );

        const result =
          SObjectCollectionValidator.validateSObjectCollectionOperation(
            listType,
            'invalidOperation',
            createMockScope(),
          );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('invalid.collection.operation');
      });

      it('should reject invalid operation on Set<SObject>', () => {
        const setType = createMockCollectionType(
          'Set',
          createMockSObjectType('Contact'),
        );

        const result =
          SObjectCollectionValidator.validateSObjectCollectionOperation(
            setType,
            'invalidOperation',
            createMockScope(),
          );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('invalid.collection.operation');
      });

      it('should reject Map with invalid key type', () => {
        const mapType = createMockMapType(
          createMockTypeInfo('Integer', false),
          createMockSObjectType('Account'),
        );

        const result =
          SObjectCollectionValidator.validateSObjectCollectionOperation(
            mapType,
            'put',
            createMockScope(),
          );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('invalid.sobject.map.key');
      });

      it('should reject Map with non-SObject value type', () => {
        const mapType = createMockMapType(
          createMockTypeInfo('Id', false),
          createMockTypeInfo('String', false),
        );

        const result =
          SObjectCollectionValidator.validateSObjectCollectionOperation(
            mapType,
            'put',
            createMockScope(),
          );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('invalid.sobject.map');
      });

      it('should reject Map with missing key type', () => {
        const mapType = createMockMapType(
          undefined as any,
          createMockSObjectType('Account'),
        );

        const result =
          SObjectCollectionValidator.validateSObjectCollectionOperation(
            mapType,
            'put',
            createMockScope(),
          );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('invalid.sobject.map');
      });

      it('should reject Map with missing value type', () => {
        const mapType = createMockMapType(
          createMockTypeInfo('Id', false),
          undefined as any,
        );

        const result =
          SObjectCollectionValidator.validateSObjectCollectionOperation(
            mapType,
            'put',
            createMockScope(),
          );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('invalid.sobject.map');
      });
    });

    describe('Edge Cases', () => {
      it('should handle empty operation name', () => {
        const listType = createMockCollectionType(
          'List',
          createMockSObjectType('Account'),
        );

        const result =
          SObjectCollectionValidator.validateSObjectCollectionOperation(
            listType,
            '',
            createMockScope(),
          );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('invalid.collection.operation');
      });

      it('should handle null operation name', () => {
        const listType = createMockCollectionType(
          'List',
          createMockSObjectType('Account'),
        );

        const result =
          SObjectCollectionValidator.validateSObjectCollectionOperation(
            listType,
            null as any,
            createMockScope(),
          );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('invalid.collection.operation');
      });

      it('should handle undefined operation name', () => {
        const listType = createMockCollectionType(
          'List',
          createMockSObjectType('Account'),
        );

        const result =
          SObjectCollectionValidator.validateSObjectCollectionOperation(
            listType,
            undefined as any,
            createMockScope(),
          );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('invalid.collection.operation');
      });

      it('should handle null type', () => {
        const result =
          SObjectCollectionValidator.validateSObjectCollectionOperation(
            null as any,
            'add',
            createMockScope(),
          );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('invalid.sobject.collection');
      });

      it('should handle undefined type', () => {
        const result =
          SObjectCollectionValidator.validateSObjectCollectionOperation(
            undefined as any,
            'add',
            createMockScope(),
          );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('invalid.sobject.collection');
      });
    });

    describe('Error Messages', () => {
      it('should return correct error message for invalid collection', () => {
        const nonCollectionType = createMockSObjectType('Account');

        const result =
          SObjectCollectionValidator.validateSObjectCollectionOperation(
            nonCollectionType,
            'add',
            createMockScope(),
          );

        expect(result.errors).toContain('invalid.sobject.collection');
      });

      it('should return correct error message for invalid operation', () => {
        const listType = createMockCollectionType(
          'List',
          createMockSObjectType('Account'),
        );

        const result =
          SObjectCollectionValidator.validateSObjectCollectionOperation(
            listType,
            'invalidOperation',
            createMockScope(),
          );

        expect(result.errors).toContain('invalid.collection.operation');
      });

      it('should return correct error message for invalid map key', () => {
        const mapType = createMockMapType(
          createMockTypeInfo('Integer', false),
          createMockSObjectType('Account'),
        );

        const result =
          SObjectCollectionValidator.validateSObjectCollectionOperation(
            mapType,
            'put',
            createMockScope(),
          );

        expect(result.errors).toContain('invalid.sobject.map.key');
      });

      it('should return correct error message for invalid map', () => {
        const mapType = createMockMapType(
          createMockTypeInfo('Id', false),
          createMockTypeInfo('String', false),
        );

        const result =
          SObjectCollectionValidator.validateSObjectCollectionOperation(
            mapType,
            'put',
            createMockScope(),
          );

        expect(result.errors).toContain('invalid.sobject.map');
      });
    });
  });

  describe('validateSObjectCollectionType', () => {
    describe('Valid SObject Collection Types', () => {
      it('should validate List<SObject> type', () => {
        const listType = createMockCollectionType(
          'List',
          createMockSObjectType('Account'),
        );

        const result = SObjectCollectionValidator.validateSObjectCollectionType(
          listType,
          createMockScope(),
        );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate Set<SObject> type', () => {
        const setType = createMockCollectionType(
          'Set',
          createMockSObjectType('Contact'),
        );

        const result = SObjectCollectionValidator.validateSObjectCollectionType(
          setType,
          createMockScope(),
        );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate Map<Id, SObject> type', () => {
        const mapType = createMockMapType(
          createMockTypeInfo('Id', false),
          createMockSObjectType('Lead'),
        );

        const result = SObjectCollectionValidator.validateSObjectCollectionType(
          mapType,
          createMockScope(),
        );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate Map<String, SObject> type', () => {
        const mapType = createMockMapType(
          createMockTypeInfo('String', false),
          createMockSObjectType('Opportunity'),
        );

        const result = SObjectCollectionValidator.validateSObjectCollectionType(
          mapType,
          createMockScope(),
        );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('Invalid SObject Collection Types', () => {
      it('should reject non-collection type', () => {
        const nonCollectionType = createMockSObjectType('Account');

        const result = SObjectCollectionValidator.validateSObjectCollectionType(
          nonCollectionType,
          createMockScope(),
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('invalid.sobject.collection');
      });

      it('should reject List with non-SObject element type', () => {
        const listType = createMockCollectionType(
          'List',
          createMockTypeInfo('String', false),
        );

        const result = SObjectCollectionValidator.validateSObjectCollectionType(
          listType,
          createMockScope(),
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('invalid.sobject.collection');
      });

      it('should reject Set with non-SObject element type', () => {
        const setType = createMockCollectionType(
          'Set',
          createMockTypeInfo('Integer', false),
        );

        const result = SObjectCollectionValidator.validateSObjectCollectionType(
          setType,
          createMockScope(),
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('invalid.sobject.collection');
      });

      it('should reject Map with invalid key type', () => {
        const mapType = createMockMapType(
          createMockTypeInfo('Integer', false),
          createMockSObjectType('Account'),
        );

        const result = SObjectCollectionValidator.validateSObjectCollectionType(
          mapType,
          createMockScope(),
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('invalid.sobject.map.key');
      });

      it('should reject Map with non-SObject value type', () => {
        const mapType = createMockMapType(
          createMockTypeInfo('Id', false),
          createMockTypeInfo('String', false),
        );

        const result = SObjectCollectionValidator.validateSObjectCollectionType(
          mapType,
          createMockScope(),
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('invalid.sobject.map');
      });
    });
  });
});
