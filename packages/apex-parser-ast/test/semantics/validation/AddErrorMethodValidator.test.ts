/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { AddErrorMethodValidator } from '../../../src/semantics/validation/AddErrorMethodValidator';
import type { ValidationScope } from '../../../src/semantics/validation/ValidationResult';
import type {
  SObjectFieldInfo,
  SObjectValidationContext,
} from '../../../src/semantics/validation/SObjectTypeValidator';

/**
 * Create a mock validation scope for testing
 */
function createMockScope(
  overrides: Partial<ValidationScope> = {},
): ValidationScope {
  return {
    supportsLongIdentifiers: false,
    version: 58,
    isFileBased: true,
    ...overrides,
  };
}

describe('AddErrorMethodValidator', () => {
  let validator: AddErrorMethodValidator;
  let mockScope: ValidationScope;
  let mockContext: SObjectValidationContext;

  beforeEach(() => {
    validator = new AddErrorMethodValidator();
    mockScope = createMockScope();
    mockContext = {
      currentType: null,
      currentMethod: null,
      currentNamespace: null,
      isStaticContext: false,
      compilationContext: {
        namespace: null,
        version: 58,
        isTrusted: false,
        sourceType: 'FILE',
        referencingType: null,
        enclosingTypes: [],
        parentTypes: [],
        isStaticContext: false,
      },
    };
  });

  describe('valid cases', () => {
    it('should allow addError on SObject scalar field', () => {
      const fieldInfo: SObjectFieldInfo = {
        name: 'Name',
        type: 'String',
        category: 'REGULAR',
        isColumn: true,
        isFormula: false,
        isRelationship: false,
      };

      const result = validator.validateAddErrorCall(
        fieldInfo,
        mockContext,
        mockScope,
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should allow addError on SObject text field', () => {
      const fieldInfo: SObjectFieldInfo = {
        name: 'Description',
        type: 'Text',
        category: 'REGULAR',
        isColumn: true,
        isFormula: false,
        isRelationship: false,
      };

      const result = validator.validateAddErrorCall(
        fieldInfo,
        mockContext,
        mockScope,
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should allow addError on SObject number field', () => {
      const fieldInfo: SObjectFieldInfo = {
        name: 'Amount',
        type: 'Currency',
        category: 'REGULAR',
        isColumn: true,
        isFormula: false,
        isRelationship: false,
      };

      const result = validator.validateAddErrorCall(
        fieldInfo,
        mockContext,
        mockScope,
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should allow addError on SObject date field', () => {
      const fieldInfo: SObjectFieldInfo = {
        name: 'CreatedDate',
        type: 'DateTime',
        category: 'REGULAR',
        isColumn: true,
        isFormula: false,
        isRelationship: false,
      };

      const result = validator.validateAddErrorCall(
        fieldInfo,
        mockContext,
        mockScope,
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should allow addError on SObject boolean field', () => {
      const fieldInfo: SObjectFieldInfo = {
        name: 'IsActive',
        type: 'Boolean',
        category: 'REGULAR',
        isColumn: true,
        isFormula: false,
        isRelationship: false,
      };

      const result = validator.validateAddErrorCall(
        fieldInfo,
        mockContext,
        mockScope,
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('invalid cases', () => {
    it('should reject addError on SOQL expression', () => {
      const fieldInfo: SObjectFieldInfo = {
        name: 'Name',
        type: 'String',
        category: 'REGULAR',
        isColumn: true,
        isFormula: false,
        isRelationship: false,
        isSoqlExpression: true,
      };

      const result = validator.validateAddErrorCall(
        fieldInfo,
        mockContext,
        mockScope,
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'method.invalid.add.error.not.sobject.scalar.field',
      );
    });

    it('should reject addError on relationship field', () => {
      const fieldInfo: SObjectFieldInfo = {
        name: 'Account',
        type: 'Account',
        category: 'RELATIONSHIP',
        isColumn: false,
        isFormula: false,
        isRelationship: true,
      };

      const result = validator.validateAddErrorCall(
        fieldInfo,
        mockContext,
        mockScope,
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'method.invalid.add.error.not.sobject.scalar.field',
      );
    });

    it('should reject addError on formula field', () => {
      const fieldInfo: SObjectFieldInfo = {
        name: 'FullName',
        type: 'String',
        category: 'FORMULA',
        isColumn: false,
        isFormula: true,
        isRelationship: false,
      };

      const result = validator.validateAddErrorCall(
        fieldInfo,
        mockContext,
        mockScope,
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'method.invalid.add.error.not.sobject.scalar.field',
      );
    });

    it('should reject addError on roll-up summary field', () => {
      const fieldInfo: SObjectFieldInfo = {
        name: 'TotalAmount',
        type: 'Currency',
        category: 'ROLLUP_SUMMARY',
        isColumn: false,
        isFormula: false,
        isRelationship: false,
      };

      const result = validator.validateAddErrorCall(
        fieldInfo,
        mockContext,
        mockScope,
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'method.invalid.add.error.not.sobject.scalar.field',
      );
    });

    it('should reject addError on non-SObject field', () => {
      const fieldInfo: SObjectFieldInfo = {
        name: 'myVariable',
        type: 'String',
        category: 'VARIABLE',
        isColumn: false,
        isFormula: false,
        isRelationship: false,
      };

      const result = validator.validateAddErrorCall(
        fieldInfo,
        mockContext,
        mockScope,
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'method.invalid.add.error.not.sobject.field',
      );
    });

    it('should reject addError on non-column field', () => {
      const fieldInfo: SObjectFieldInfo = {
        name: 'CalculatedField',
        type: 'String',
        category: 'REGULAR',
        isColumn: false,
        isFormula: false,
        isRelationship: false,
      };

      const result = validator.validateAddErrorCall(
        fieldInfo,
        mockContext,
        mockScope,
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'method.invalid.add.error.not.sobject.scalar.field',
      );
    });
  });

  describe('safe navigation operator', () => {
    it('should reject addError after safe navigation operator', () => {
      const fieldInfo: SObjectFieldInfo = {
        name: 'Name',
        type: 'String',
        category: 'REGULAR',
        isColumn: true,
        isFormula: false,
        isRelationship: false,
        hasSafeNavigation: true,
      };

      const result = validator.validateAddErrorCall(
        fieldInfo,
        mockContext,
        mockScope,
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'safe.navigation.invalid.between.sobject.field.and.add.error',
      );
    });

    it('should allow addError without safe navigation operator', () => {
      const fieldInfo: SObjectFieldInfo = {
        name: 'Name',
        type: 'String',
        category: 'REGULAR',
        isColumn: true,
        isFormula: false,
        isRelationship: false,
        hasSafeNavigation: false,
      };

      const result = validator.validateAddErrorCall(
        fieldInfo,
        mockContext,
        mockScope,
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('edge cases', () => {
    it('should handle null field info', () => {
      const result = validator.validateAddErrorCall(
        null as any,
        mockContext,
        mockScope,
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'method.invalid.add.error.not.sobject.field',
      );
    });

    it('should handle undefined field info', () => {
      const result = validator.validateAddErrorCall(
        undefined as any,
        mockContext,
        mockScope,
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'method.invalid.add.error.not.sobject.field',
      );
    });

    it('should handle field info with missing properties', () => {
      const fieldInfo = {
        name: 'Name',
        type: 'String',
      } as SObjectFieldInfo;

      const result = validator.validateAddErrorCall(
        fieldInfo,
        mockContext,
        mockScope,
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'method.invalid.add.error.not.sobject.field',
      );
    });
  });

  describe('error messages', () => {
    it('should return correct error message for non-SObject field', () => {
      const fieldInfo: SObjectFieldInfo = {
        name: 'myVariable',
        type: 'String',
        category: 'VARIABLE',
        isColumn: false,
        isFormula: false,
        isRelationship: false,
      };

      const result = validator.validateAddErrorCall(
        fieldInfo,
        mockContext,
        mockScope,
      );

      expect(result.errors).toContain(
        'method.invalid.add.error.not.sobject.field',
      );
    });

    it('should return correct error message for non-scalar SObject field', () => {
      const fieldInfo: SObjectFieldInfo = {
        name: 'Account',
        type: 'Account',
        category: 'RELATIONSHIP',
        isColumn: false,
        isFormula: false,
        isRelationship: true,
      };

      const result = validator.validateAddErrorCall(
        fieldInfo,
        mockContext,
        mockScope,
      );

      expect(result.errors).toContain(
        'method.invalid.add.error.not.sobject.scalar.field',
      );
    });

    it('should return correct error message for safe navigation', () => {
      const fieldInfo: SObjectFieldInfo = {
        name: 'Name',
        type: 'String',
        category: 'REGULAR',
        isColumn: true,
        isFormula: false,
        isRelationship: false,
        hasSafeNavigation: true,
      };

      const result = validator.validateAddErrorCall(
        fieldInfo,
        mockContext,
        mockScope,
      );

      expect(result.errors).toContain(
        'safe.navigation.invalid.between.sobject.field.and.add.error',
      );
    });
  });

  describe('performance', () => {
    it('should validate quickly for valid cases', () => {
      const fieldInfo: SObjectFieldInfo = {
        name: 'Name',
        type: 'String',
        category: 'REGULAR',
        isColumn: true,
        isFormula: false,
        isRelationship: false,
      };

      const startTime = performance.now();

      for (let i = 0; i < 1000; i++) {
        validator.validateAddErrorCall(fieldInfo, mockContext, mockScope);
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      expect(totalTime).toBeLessThan(100); // Should complete 1000 validations in under 100ms
    });

    it('should validate quickly for invalid cases', () => {
      const fieldInfo: SObjectFieldInfo = {
        name: 'Account',
        type: 'Account',
        category: 'RELATIONSHIP',
        isColumn: false,
        isFormula: false,
        isRelationship: true,
      };

      const startTime = performance.now();

      for (let i = 0; i < 1000; i++) {
        validator.validateAddErrorCall(fieldInfo, mockContext, mockScope);
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      expect(totalTime).toBeLessThan(100); // Should complete 1000 validations in under 100ms
    });
  });
});
