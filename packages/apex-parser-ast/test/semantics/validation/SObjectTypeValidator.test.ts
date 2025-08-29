/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { SObjectTypeValidator } from '../../../src/semantics/validation/SObjectTypeValidator';
import type {
  ValidationScope,
  TypeInfo,
  SObjectFieldInfo,
} from '../../../src/semantics/validation/SObjectTypeValidator';

describe('SObjectTypeValidator', () => {
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

  const createMockSObjectField = (
    name: string,
    type: string,
    isAccessible = true,
    isRegular = true,
    isRelationship = false,
  ): SObjectFieldInfo => ({
    name,
    type,
    isAccessible,
    isRegular,
    isRelationship,
    isFormula: false,
    isCalculated: false,
    isCustom: name.includes('__c'),
  });

  describe('validateSObjectType', () => {
    describe('Valid SObject Types', () => {
      it('should validate standard SObject types', () => {
        const sobjectType = createMockSObjectType('Account');

        const result = SObjectTypeValidator.validateSObjectType(
          sobjectType,
          createMockScope(),
        );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate custom SObject types', () => {
        const sobjectType = createMockSObjectType('CustomObject__c');

        const result = SObjectTypeValidator.validateSObjectType(
          sobjectType,
          createMockScope(),
        );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate SObject List collections', () => {
        const sobjectListType = createMockCollectionType(
          'List',
          createMockSObjectType('Contact'),
        );

        const result = SObjectTypeValidator.validateSObjectType(
          sobjectListType,
          createMockScope(),
        );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate SObject Set collections', () => {
        const sobjectSetType = createMockCollectionType(
          'Set',
          createMockSObjectType('Lead'),
        );

        const result = SObjectTypeValidator.validateSObjectType(
          sobjectSetType,
          createMockScope(),
        );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate SObject Map collections with Id key', () => {
        const sobjectMapType = createMockMapType(
          createMockTypeInfo('Id', true), // Id key
          createMockSObjectType('Opportunity'),
        );

        const result = SObjectTypeValidator.validateSObjectType(
          sobjectMapType,
          createMockScope(),
        );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate SObject Map collections with String key', () => {
        const sobjectMapType = createMockMapType(
          createMockTypeInfo('String', true), // String key
          createMockSObjectType('Case'),
        );

        const result = SObjectTypeValidator.validateSObjectType(
          sobjectMapType,
          createMockScope(),
        );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('Invalid SObject Types', () => {
      it('should reject invalid SObject type names', () => {
        const invalidType = createMockSObjectType('InvalidObject');

        const result = SObjectTypeValidator.validateSObjectType(
          invalidType,
          createMockScope(),
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('invalid.sobject.type');
      });

      it('should reject SObject Map with non-SObject value', () => {
        const invalidMapType = createMockMapType(
          createMockTypeInfo('Id', true),
          createMockTypeInfo('String', true), // Non-SObject value
        );

        const result = SObjectTypeValidator.validateSObjectType(
          invalidMapType,
          createMockScope(),
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('invalid.sobject.map');
      });

      it('should reject SObject Map with non-Id/String key', () => {
        const invalidMapType = createMockMapType(
          createMockTypeInfo('Integer', true), // Invalid key type
          createMockSObjectType('Account'),
        );

        const result = SObjectTypeValidator.validateSObjectType(
          invalidMapType,
          createMockScope(),
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('invalid.sobject.map.key');
      });

      it('should reject non-SObject collections', () => {
        const invalidListType = createMockCollectionType(
          'List',
          createMockTypeInfo('String', true),
        );

        const result = SObjectTypeValidator.validateSObjectType(
          invalidListType,
          createMockScope(),
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('invalid.sobject.collection');
      });

      it('should reject primitive types', () => {
        const primitiveType = createMockTypeInfo('String', true);

        const result = SObjectTypeValidator.validateSObjectType(
          primitiveType,
          createMockScope(),
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('invalid.sobject.type');
      });
    });
  });

  describe('validateSObjectField', () => {
    describe('Valid SObject Fields', () => {
      it('should validate standard SObject fields', () => {
        const field = createMockSObjectField('Name', 'String');

        const result = SObjectTypeValidator.validateSObjectField(
          field,
          createMockSObjectType('Account'),
          createMockScope(),
        );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate custom SObject fields', () => {
        const field = createMockSObjectField('CustomField__c', 'String');

        const result = SObjectTypeValidator.validateSObjectField(
          field,
          createMockSObjectType('CustomObject__c'),
          createMockScope(),
        );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate relationship fields', () => {
        const field = createMockSObjectField(
          'Account',
          'Account',
          true,
          true,
          true,
        );

        const result = SObjectTypeValidator.validateSObjectField(
          field,
          createMockSObjectType('Contact'),
          createMockScope(),
        );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate formula fields', () => {
        const field = createMockSObjectField('FormulaField__c', 'String');
        field.isFormula = true;

        const result = SObjectTypeValidator.validateSObjectField(
          field,
          createMockSObjectType('Account'),
          createMockScope(),
        );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('Invalid SObject Fields', () => {
      it('should reject inaccessible fields', () => {
        const field = createMockSObjectField(
          'PrivateField__c',
          'String',
          false,
        );

        const result = SObjectTypeValidator.validateSObjectField(
          field,
          createMockSObjectType('Account'),
          createMockScope(),
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('field.not.accessible');
      });

      it('should reject non-existent fields', () => {
        const field = createMockSObjectField('NonExistentField', 'String');

        const result = SObjectTypeValidator.validateSObjectField(
          field,
          createMockSObjectType('Account'),
          createMockScope(),
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('field.does.not.exist');
      });

      it('should reject fields on invalid SObject types', () => {
        const field = createMockSObjectField('Name', 'String');

        const result = SObjectTypeValidator.validateSObjectField(
          field,
          createMockTypeInfo('InvalidObject', false, true),
          createMockScope(),
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('invalid.sobject.type');
      });
    });
  });

  describe('validateSObjectFieldAccess', () => {
    describe('Valid Field Access', () => {
      it('should validate direct field access', () => {
        const field = createMockSObjectField('Name', 'String');

        const result = SObjectTypeValidator.validateSObjectFieldAccess(
          field,
          'direct',
          createMockScope(),
        );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate relationship field access', () => {
        const field = createMockSObjectField(
          'Account',
          'Account',
          true,
          true,
          true,
        );

        const result = SObjectTypeValidator.validateSObjectFieldAccess(
          field,
          'relationship',
          createMockScope(),
        );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate formula field access', () => {
        const field = createMockSObjectField('FormulaField__c', 'String');
        field.isFormula = true;

        const result = SObjectTypeValidator.validateSObjectFieldAccess(
          field,
          'formula',
          createMockScope(),
        );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('Invalid Field Access', () => {
      it('should reject AddError on non-regular fields', () => {
        const field = createMockSObjectField('FormulaField__c', 'String');
        field.isFormula = true;

        const result = SObjectTypeValidator.validateSObjectFieldAccess(
          field,
          'addError',
          createMockScope(),
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          'method.invalid.add.error.not.sobject.scalar.field',
        );
      });

      it('should reject AddError on relationship fields', () => {
        const field = createMockSObjectField(
          'Account',
          'Account',
          true,
          true,
          true,
        );

        const result = SObjectTypeValidator.validateSObjectFieldAccess(
          field,
          'addError',
          createMockScope(),
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          'method.invalid.add.error.not.sobject.scalar.field',
        );
      });

      it('should reject AddError on calculated fields', () => {
        const field = createMockSObjectField('CalculatedField__c', 'String');
        field.isCalculated = true;

        const result = SObjectTypeValidator.validateSObjectFieldAccess(
          field,
          'addError',
          createMockScope(),
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          'method.invalid.add.error.not.sobject.scalar.field',
        );
      });
    });
  });

  describe('validateSObjectCollection', () => {
    describe('Valid SObject Collections', () => {
      it('should validate List<SObject> operations', () => {
        const listType = createMockCollectionType(
          'List',
          createMockSObjectType('Account'),
        );

        const result = SObjectTypeValidator.validateSObjectCollection(
          listType,
          'add',
          createMockScope(),
        );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate Set<SObject> operations', () => {
        const setType = createMockCollectionType(
          'Set',
          createMockSObjectType('Contact'),
        );

        const result = SObjectTypeValidator.validateSObjectCollection(
          setType,
          'add',
          createMockScope(),
        );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate Map<Id, SObject> operations', () => {
        const mapType = createMockMapType(
          createMockTypeInfo('Id', true),
          createMockSObjectType('Lead'),
        );

        const result = SObjectTypeValidator.validateSObjectCollection(
          mapType,
          'put',
          createMockScope(),
        );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('Invalid SObject Collections', () => {
      it('should reject non-SObject collections', () => {
        const listType = createMockCollectionType(
          'List',
          createMockTypeInfo('String', true),
        );

        const result = SObjectTypeValidator.validateSObjectCollection(
          listType,
          'add',
          createMockScope(),
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('invalid.sobject.collection');
      });

      it('should reject invalid collection operations', () => {
        const listType = createMockCollectionType(
          'List',
          createMockSObjectType('Account'),
        );

        const result = SObjectTypeValidator.validateSObjectCollection(
          listType,
          'invalidOperation',
          createMockScope(),
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('invalid.collection.operation');
      });
    });
  });

  describe('validateSObjectRelationship', () => {
    describe('Valid SObject Relationships', () => {
      it('should validate parent relationship navigation', () => {
        const parentField = createMockSObjectField(
          'Account',
          'Account',
          true,
          true,
          true,
        );

        const result = SObjectTypeValidator.validateSObjectRelationship(
          parentField,
          'parent',
          createMockScope(),
        );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate child relationship navigation', () => {
        const childField = createMockSObjectField(
          'Contacts',
          'List<Contact>',
          true,
          true,
          true,
        );

        const result = SObjectTypeValidator.validateSObjectRelationship(
          childField,
          'child',
          createMockScope(),
        );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('Invalid SObject Relationships', () => {
      it('should reject relationship navigation on non-relationship fields', () => {
        const field = createMockSObjectField('Name', 'String');

        const result = SObjectTypeValidator.validateSObjectRelationship(
          field,
          'parent',
          createMockScope(),
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('invalid.relationship.field');
      });

      it('should reject invalid relationship types', () => {
        const field = createMockSObjectField(
          'Account',
          'Account',
          true,
          true,
          true,
        );

        const result = SObjectTypeValidator.validateSObjectRelationship(
          field,
          'invalid',
          createMockScope(),
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('invalid.relationship.type');
      });
    });
  });

  describe('Integration Tests', () => {
    it('should validate complete SObject field access chain', () => {
      const accountType = createMockSObjectType('Account');
      const contactType = createMockSObjectType('Contact');
      const nameField = createMockSObjectField('Name', 'String');

      // Validate Account type
      const accountResult = SObjectTypeValidator.validateSObjectType(
        accountType,
        createMockScope(),
      );
      expect(accountResult.isValid).toBe(true);

      // Validate Contact type
      const contactResult = SObjectTypeValidator.validateSObjectType(
        contactType,
        createMockScope(),
      );
      expect(contactResult.isValid).toBe(true);

      // Validate Name field on Account
      const fieldResult = SObjectTypeValidator.validateSObjectField(
        nameField,
        accountType,
        createMockScope(),
      );
      expect(fieldResult.isValid).toBe(true);

      // Validate direct field access
      const accessResult = SObjectTypeValidator.validateSObjectFieldAccess(
        nameField,
        'direct',
        createMockScope(),
      );
      expect(accessResult.isValid).toBe(true);
    });

    it('should validate SObject collection with field access', () => {
      const accountListType = createMockCollectionType(
        'List',
        createMockSObjectType('Account'),
      );
      const nameField = createMockSObjectField('Name', 'String');

      // Validate List<Account> type
      const collectionResult = SObjectTypeValidator.validateSObjectType(
        accountListType,
        createMockScope(),
      );
      expect(collectionResult.isValid).toBe(true);

      // Validate collection operations
      const operationResult = SObjectTypeValidator.validateSObjectCollection(
        accountListType,
        'add',
        createMockScope(),
      );
      expect(operationResult.isValid).toBe(true);

      // Validate field access on collection elements
      const fieldResult = SObjectTypeValidator.validateSObjectField(
        nameField,
        accountListType.elementType!,
        createMockScope(),
      );
      expect(fieldResult.isValid).toBe(true);
    });
  });
});
