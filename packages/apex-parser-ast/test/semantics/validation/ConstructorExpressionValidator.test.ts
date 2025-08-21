/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ConstructorExpressionValidator } from '../../../src/semantics/validation/ConstructorExpressionValidator';
import type { ValidationScope } from '../../../src/semantics/validation/ValidationResult';
import type { ExpressionType } from '../../../src/semantics/validation/TypePromotionSystem';

describe('ConstructorExpressionValidator', () => {
  const createMockScope = (version = 58): ValidationScope => ({
    version,
    namespace: 'default',
    currentClass: 'TestClass',
    currentMethod: 'testMethod',
    isStatic: false,
  });

  const createMockType = (name: string): ExpressionType => ({
    name,
    isPrimitive: true,
    isVoid: false,
  });

  describe('validateConstructorExpression', () => {
    it('should validate valid constructor with no arguments', () => {
      const scope = createMockScope();
      const targetType = createMockType('String');
      const fieldInitializers = new Map<string, ExpressionType>();

      const result =
        ConstructorExpressionValidator.validateConstructorExpression(
          targetType,
          fieldInitializers,
          scope,
        );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should validate valid constructor with field initializers', () => {
      const scope = createMockScope();
      const targetType = createMockType('Account');
      const fieldInitializers = new Map<string, ExpressionType>([
        ['Name', createMockType('String')],
        ['Phone', createMockType('String')],
      ]);

      const result =
        ConstructorExpressionValidator.validateConstructorExpression(
          targetType,
          fieldInitializers,
          scope,
        );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should reject constructor with duplicate field initialization', () => {
      const scope = createMockScope();
      const targetType = createMockType('Account');
      const fieldInitializers = new Map<string, ExpressionType>();
      fieldInitializers.set('Name', createMockType('String'));
      fieldInitializers.set('Name', createMockType('String')); // This overwrites the previous entry

      // Create a Map with actual duplicates by using different case
      const fieldInitializersWithDuplicates = new Map<string, ExpressionType>([
        ['Name', createMockType('String')],
        ['name', createMockType('String')], // Duplicate field (case-insensitive)
      ]);

      const result =
        ConstructorExpressionValidator.validateConstructorExpression(
          targetType,
          fieldInitializersWithDuplicates,
          scope,
        );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('duplicate.field.init');
    });

    it('should reject constructor with non-existent field', () => {
      const scope = createMockScope();
      const targetType = createMockType('Account');
      const fieldInitializers = new Map<string, ExpressionType>([
        ['NonExistentField', createMockType('String')],
      ]);

      const result =
        ConstructorExpressionValidator.validateConstructorExpression(
          targetType,
          fieldInitializers,
          scope,
        );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('field.does.not.exist');
    });

    it('should reject constructor with incompatible field type', () => {
      const scope = createMockScope();
      const targetType = createMockType('Account');
      const fieldInitializers = new Map<string, ExpressionType>([
        ['Name', createMockType('Integer')], // String field with Integer value
      ]);

      const result =
        ConstructorExpressionValidator.validateConstructorExpression(
          targetType,
          fieldInitializers,
          scope,
        );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('illegal.assignment');
    });

    it('should reject constructor that does not support name-value pair syntax', () => {
      const scope = createMockScope();
      const targetType = createMockType('String'); // String doesn't support name-value pairs
      const fieldInitializers = new Map<string, ExpressionType>([
        ['Name', createMockType('String')],
      ]);

      const result =
        ConstructorExpressionValidator.validateConstructorExpression(
          targetType,
          fieldInitializers,
          scope,
        );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('invalid.name.value.pair.constructor');
    });

    it('should handle case-insensitive field name matching', () => {
      const scope = createMockScope();
      const targetType = createMockType('Account');
      const fieldInitializers = new Map<string, ExpressionType>([
        ['name', createMockType('String')], // lowercase
        ['PHONE', createMockType('String')], // uppercase
      ]);

      const result =
        ConstructorExpressionValidator.validateConstructorExpression(
          targetType,
          fieldInitializers,
          scope,
        );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate primitive type constructors', () => {
      const scope = createMockScope();
      const targetType = createMockType('Integer');
      const fieldInitializers = new Map<string, ExpressionType>();

      const result =
        ConstructorExpressionValidator.validateConstructorExpression(
          targetType,
          fieldInitializers,
          scope,
        );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate SObject constructors', () => {
      const scope = createMockScope();
      const targetType = createMockType('Contact');
      const fieldInitializers = new Map<string, ExpressionType>([
        ['FirstName', createMockType('String')],
        ['LastName', createMockType('String')],
        ['Email', createMockType('String')],
      ]);

      const result =
        ConstructorExpressionValidator.validateConstructorExpression(
          targetType,
          fieldInitializers,
          scope,
        );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate custom object constructors', () => {
      const scope = createMockScope();
      const targetType = createMockType('CustomObject__c');
      const fieldInitializers = new Map<string, ExpressionType>([
        ['CustomField__c', createMockType('String')],
      ]);

      const result =
        ConstructorExpressionValidator.validateConstructorExpression(
          targetType,
          fieldInitializers,
          scope,
        );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle multiple validation errors', () => {
      const scope = createMockScope();
      const targetType = createMockType('Account');
      const fieldInitializers = new Map<string, ExpressionType>([
        ['Name', createMockType('String')],
        ['name', createMockType('String')], // Duplicate (case-insensitive)
        ['NonExistentField', createMockType('String')], // Non-existent
        ['Phone', createMockType('Integer')], // Incompatible type
      ]);

      const result =
        ConstructorExpressionValidator.validateConstructorExpression(
          targetType,
          fieldInitializers,
          scope,
        );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('duplicate.field.init');
      expect(result.errors).toContain('field.does.not.exist');
      expect(result.errors).toContain('illegal.assignment');
    });
  });

  describe('validateFieldExistence', () => {
    it('should validate existing field', () => {
      const targetType = createMockType('Account');
      const fieldName = 'Name';

      const result = ConstructorExpressionValidator.validateFieldExistence(
        targetType,
        fieldName,
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject non-existent field', () => {
      const targetType = createMockType('Account');
      const fieldName = 'NonExistentField';

      const result = ConstructorExpressionValidator.validateFieldExistence(
        targetType,
        fieldName,
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('field.does.not.exist');
    });

    it('should handle case-insensitive field names', () => {
      const targetType = createMockType('Account');
      const fieldName = 'name'; // lowercase

      const result = ConstructorExpressionValidator.validateFieldExistence(
        targetType,
        fieldName,
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateFieldTypeCompatibility', () => {
    it('should validate compatible field types', () => {
      const fieldName = 'Name';
      const fieldType = createMockType('String');
      const expressionType = createMockType('String');

      const result =
        ConstructorExpressionValidator.validateFieldTypeCompatibility(
          fieldName,
          fieldType,
          expressionType,
        );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject incompatible field types', () => {
      const fieldName = 'Name';
      const fieldType = createMockType('String');
      const expressionType = createMockType('Integer');

      const result =
        ConstructorExpressionValidator.validateFieldTypeCompatibility(
          fieldName,
          fieldType,
          expressionType,
        );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('illegal.assignment');
    });

    it('should allow numeric type promotion', () => {
      const fieldName = 'NumberField';
      const fieldType = createMockType('Double');
      const expressionType = createMockType('Integer');

      const result =
        ConstructorExpressionValidator.validateFieldTypeCompatibility(
          fieldName,
          fieldType,
          expressionType,
        );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should allow null assignment to any type', () => {
      const fieldName = 'Name';
      const fieldType = createMockType('String');
      const expressionType = createMockType('null');

      const result =
        ConstructorExpressionValidator.validateFieldTypeCompatibility(
          fieldName,
          fieldType,
          expressionType,
        );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateNameValuePairSupport', () => {
    it('should validate SObject types support name-value pairs', () => {
      const targetType = createMockType('Account');

      const result =
        ConstructorExpressionValidator.validateNameValuePairSupport(targetType);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject primitive types that do not support name-value pairs', () => {
      const targetType = createMockType('String');

      const result =
        ConstructorExpressionValidator.validateNameValuePairSupport(targetType);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('invalid.name.value.pair.constructor');
    });

    it('should validate custom object types support name-value pairs', () => {
      const targetType = createMockType('CustomObject__c');

      const result =
        ConstructorExpressionValidator.validateNameValuePairSupport(targetType);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate standard object types support name-value pairs', () => {
      const targetType = createMockType('Contact');

      const result =
        ConstructorExpressionValidator.validateNameValuePairSupport(targetType);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});
