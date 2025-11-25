/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { CustomEntityValidator } from '../../../src/semantics/validation/CustomEntityValidator';
import { ValidationScope } from '../../../src/semantics/validation/ValidationResult';

describe('CustomEntityValidator', () => {
  let scope: ValidationScope;

  beforeEach(() => {
    scope = {
      currentNamespace: '',
      targetNamespace: '',
      isTestContext: false,
      apiVersion: '58.0',
    };
  });

  describe('validateCustomEntityType', () => {
    describe('valid cases', () => {
      it('should validate standard custom SObject types ending with __c', () => {
        const typeInfo = {
          name: 'Custom_Object__c',
          namespace: '',
          isVisible: true,
          isCustom: true,
        };

        const result = CustomEntityValidator.validateCustomEntityType(
          typeInfo,
          scope,
        );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate custom SObject types ending with __kav', () => {
        const typeInfo = {
          name: 'Custom_Knowledge__kav',
          namespace: '',
          isVisible: true,
          isCustom: true,
        };

        const result = CustomEntityValidator.validateCustomEntityType(
          typeInfo,
          scope,
        );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate custom SObject types ending with __ka', () => {
        const typeInfo = {
          name: 'Custom_Knowledge__ka',
          namespace: '',
          isVisible: true,
          isCustom: true,
        };

        const result = CustomEntityValidator.validateCustomEntityType(
          typeInfo,
          scope,
        );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate custom SObject types ending with __x', () => {
        const typeInfo = {
          name: 'Custom_External__x',
          namespace: '',
          isVisible: true,
          isCustom: true,
        };

        const result = CustomEntityValidator.validateCustomEntityType(
          typeInfo,
          scope,
        );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate custom SObject types with namespace', () => {
        const typeInfo = {
          name: 'Custom_Object__c',
          namespace: 'MyNamespace',
          isVisible: true,
          isCustom: true,
        };

        const result = CustomEntityValidator.validateCustomEntityType(
          typeInfo,
          scope,
        );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('invalid cases', () => {
      it('should reject custom entity types that do not follow naming conventions', () => {
        const typeInfo = {
          name: 'InvalidCustomObject',
          namespace: '',
          isVisible: true,
          isCustom: true,
        };

        const result = CustomEntityValidator.validateCustomEntityType(
          typeInfo,
          scope,
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]).toBe(
          'custom.entity.invalid.naming.convention',
        );
      });

      it('should reject custom entity types with invalid suffixes', () => {
        const typeInfo = {
          name: 'Custom_Object__invalid',
          namespace: '',
          isVisible: true,
          isCustom: true,
        };

        const result = CustomEntityValidator.validateCustomEntityType(
          typeInfo,
          scope,
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]).toBe(
          'custom.entity.invalid.naming.convention',
        );
      });

      it('should reject custom entity types that are not visible', () => {
        const typeInfo = {
          name: 'Custom_Object__c',
          namespace: '',
          isVisible: false,
          isCustom: true,
        };

        const result = CustomEntityValidator.validateCustomEntityType(
          typeInfo,
          scope,
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]).toBe('custom.entity.not.visible');
      });

      it('should reject non-custom entity types', () => {
        const typeInfo = {
          name: 'Account',
          namespace: '',
          isVisible: true,
          isCustom: false,
        };

        const result = CustomEntityValidator.validateCustomEntityType(
          typeInfo,
          scope,
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]).toBe('custom.entity.not.custom.type');
      });
    });

    describe('edge cases', () => {
      it('should handle empty type names', () => {
        const typeInfo = {
          name: '',
          namespace: '',
          isVisible: true,
          isCustom: true,
        };

        const result = CustomEntityValidator.validateCustomEntityType(
          typeInfo,
          scope,
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]).toBe(
          'custom.entity.invalid.naming.convention',
        );
      });

      it('should handle type names with only suffix', () => {
        const typeInfo = {
          name: '__c',
          namespace: '',
          isVisible: true,
          isCustom: true,
        };

        const result = CustomEntityValidator.validateCustomEntityType(
          typeInfo,
          scope,
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]).toBe(
          'custom.entity.invalid.naming.convention',
        );
      });

      it('should handle type names with multiple underscores', () => {
        const typeInfo = {
          name: 'Custom__Object__c',
          namespace: '',
          isVisible: true,
          isCustom: true,
        };

        const result = CustomEntityValidator.validateCustomEntityType(
          typeInfo,
          scope,
        );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });
  });

  describe('validateCustomEntityField', () => {
    describe('valid cases', () => {
      it('should validate custom fields ending with __c', () => {
        const fieldInfo = {
          name: 'Custom_Field__c',
          type: 'String',
          isVisible: true,
          isCustom: true,
        };

        const result = CustomEntityValidator.validateCustomEntityField(
          fieldInfo,
          scope,
        );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate custom fields with namespace', () => {
        const fieldInfo = {
          name: 'Custom_Field__c',
          type: 'String',
          isVisible: true,
          isCustom: true,
          namespace: 'MyNamespace',
        };

        const result = CustomEntityValidator.validateCustomEntityField(
          fieldInfo,
          scope,
        );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate custom fields with various data types', () => {
        const fieldTypes = [
          'String',
          'Number',
          'Boolean',
          'Date',
          'DateTime',
          'Picklist',
        ];

        for (const fieldType of fieldTypes) {
          const fieldInfo = {
            name: 'Custom_Field__c',
            type: fieldType,
            isVisible: true,
            isCustom: true,
          };

          const result = CustomEntityValidator.validateCustomEntityField(
            fieldInfo,
            scope,
          );

          expect(result.isValid).toBe(true);
          expect(result.errors).toHaveLength(0);
        }
      });
    });

    describe('invalid cases', () => {
      it('should reject custom fields that do not follow naming conventions', () => {
        const fieldInfo = {
          name: 'InvalidCustomField',
          type: 'String',
          isVisible: true,
          isCustom: true,
        };

        const result = CustomEntityValidator.validateCustomEntityField(
          fieldInfo,
          scope,
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]).toBe(
          'custom.entity.field.invalid.naming.convention',
        );
      });

      it('should reject custom fields that are not visible', () => {
        const fieldInfo = {
          name: 'Custom_Field__c',
          type: 'String',
          isVisible: false,
          isCustom: true,
        };

        const result = CustomEntityValidator.validateCustomEntityField(
          fieldInfo,
          scope,
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]).toBe('custom.entity.field.not.visible');
      });

      it('should reject non-custom fields', () => {
        const fieldInfo = {
          name: 'Name',
          type: 'String',
          isVisible: true,
          isCustom: false,
        };

        const result = CustomEntityValidator.validateCustomEntityField(
          fieldInfo,
          scope,
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]).toBe('custom.entity.field.not.custom');
      });
    });
  });

  describe('validateCustomEntityOperation', () => {
    describe('valid cases', () => {
      it('should validate valid custom entity operations', () => {
        const operationInfo = {
          operation: 'insert',
          entityType: 'Custom_Object__c',
          isVisible: true,
          isCustom: true,
        };

        const result = CustomEntityValidator.validateCustomEntityOperation(
          operationInfo,
          scope,
        );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate all standard DML operations', () => {
        const operations = ['insert', 'update', 'upsert', 'delete', 'undelete'];

        for (const operation of operations) {
          const operationInfo = {
            operation,
            entityType: 'Custom_Object__c',
            isVisible: true,
            isCustom: true,
          };

          const result = CustomEntityValidator.validateCustomEntityOperation(
            operationInfo,
            scope,
          );

          expect(result.isValid).toBe(true);
          expect(result.errors).toHaveLength(0);
        }
      });

      it('should validate SOQL operations on custom entities', () => {
        const operationInfo = {
          operation: 'select',
          entityType: 'Custom_Object__c',
          isVisible: true,
          isCustom: true,
        };

        const result = CustomEntityValidator.validateCustomEntityOperation(
          operationInfo,
          scope,
        );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('invalid cases', () => {
      it('should reject operations on non-visible custom entities', () => {
        const operationInfo = {
          operation: 'insert',
          entityType: 'Custom_Object__c',
          isVisible: false,
          isCustom: true,
        };

        const result = CustomEntityValidator.validateCustomEntityOperation(
          operationInfo,
          scope,
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]).toBe('custom.entity.operation.not.visible');
      });

      it('should reject operations on non-custom entities', () => {
        const operationInfo = {
          operation: 'insert',
          entityType: 'Account',
          isVisible: true,
          isCustom: false,
        };

        const result = CustomEntityValidator.validateCustomEntityOperation(
          operationInfo,
          scope,
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]).toBe('custom.entity.operation.not.custom');
      });

      it('should reject invalid operations', () => {
        const operationInfo = {
          operation: 'invalid_operation',
          entityType: 'Custom_Object__c',
          isVisible: true,
          isCustom: true,
        };

        const result = CustomEntityValidator.validateCustomEntityOperation(
          operationInfo,
          scope,
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]).toBe('custom.entity.operation.invalid');
      });
    });
  });

  describe('validateCustomEntityVisibility', () => {
    describe('valid cases', () => {
      it('should validate visible custom entities in same namespace', () => {
        const visibilityInfo = {
          entityType: 'Custom_Object__c',
          currentNamespace: 'MyNamespace',
          targetNamespace: 'MyNamespace',
          isVisible: true,
        };

        const result = CustomEntityValidator.validateCustomEntityVisibility(
          visibilityInfo,
          scope,
        );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate visible custom entities in global namespace', () => {
        const visibilityInfo = {
          entityType: 'Custom_Object__c',
          currentNamespace: '',
          targetNamespace: '',
          isVisible: true,
        };

        const result = CustomEntityValidator.validateCustomEntityVisibility(
          visibilityInfo,
          scope,
        );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('invalid cases', () => {
      it('should reject non-visible custom entities', () => {
        const visibilityInfo = {
          entityType: 'Custom_Object__c',
          currentNamespace: 'MyNamespace',
          targetNamespace: 'MyNamespace',
          isVisible: false,
        };

        const result = CustomEntityValidator.validateCustomEntityVisibility(
          visibilityInfo,
          scope,
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]).toBe(
          'custom.entity.visibility.not.accessible',
        );
      });

      it('should reject custom entities from different namespaces without proper access', () => {
        const visibilityInfo = {
          entityType: 'Custom_Object__c',
          currentNamespace: 'MyNamespace',
          targetNamespace: 'OtherNamespace',
          isVisible: false,
        };

        const result = CustomEntityValidator.validateCustomEntityVisibility(
          visibilityInfo,
          scope,
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]).toBe(
          'custom.entity.visibility.not.accessible',
        );
      });
    });
  });

  describe('error messages', () => {
    it('should provide specific error messages for different validation failures', () => {
      const testCases = [
        {
          typeInfo: {
            name: 'InvalidName',
            namespace: '',
            isVisible: true,
            isCustom: true,
          },
          expectedError: 'custom.entity.invalid.naming.convention',
        },
        {
          typeInfo: {
            name: 'Custom_Object__c',
            namespace: '',
            isVisible: false,
            isCustom: true,
          },
          expectedError: 'custom.entity.not.visible',
        },
        {
          typeInfo: {
            name: 'Account',
            namespace: '',
            isVisible: true,
            isCustom: false,
          },
          expectedError: 'custom.entity.not.custom.type',
        },
      ];

      for (const testCase of testCases) {
        const result = CustomEntityValidator.validateCustomEntityType(
          testCase.typeInfo,
          scope,
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]).toBe(testCase.expectedError);
      }
    });
  });
});
