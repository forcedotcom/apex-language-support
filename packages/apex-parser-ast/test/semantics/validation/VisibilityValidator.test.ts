/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { VisibilityValidator } from '../../../src/semantics/validation/VisibilityValidator';
import type {
  ValidationResult,
  ValidationScope,
} from '../../../src/semantics/validation/ValidationResult';

/**
 * Mock validation scope for testing
 */
const mockValidationScope = (
  overrides: Partial<ValidationScope> = {},
): ValidationScope => ({
  supportsLongIdentifiers: true,
  version: 58,
  isFileBased: true,
  ...overrides,
});

/**
 * Mock type information for testing
 */
const mockTypeInfo = (
  name: string,
  visibility: string = 'public',
  isStatic = false,
) => ({
  name,
  visibility,
  isStatic,
});

/**
 * Mock method information for testing
 */
const mockMethodInfo = (
  name: string,
  visibility: string = 'public',
  isStatic = false,
) => ({
  name,
  visibility,
  isStatic,
});

/**
 * Mock variable information for testing
 */
const mockVariableInfo = (
  name: string,
  visibility: string = 'public',
  isStatic = false,
) => ({
  name,
  visibility,
  isStatic,
});

describe('VisibilityValidator', () => {
  describe('Type Visibility Validation', () => {
    describe('validateTypeVisibility', () => {
      it('should validate public type access', () => {
        const result = VisibilityValidator.validateTypeVisibility(
          mockTypeInfo('MyClass', 'public'),
          mockValidationScope(),
        );
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate private type access within same class', () => {
        const result = VisibilityValidator.validateTypeVisibility(
          mockTypeInfo('MyClass', 'private'),
          { ...mockValidationScope(), currentType: { name: 'MyClass' } },
        );
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject private type access from different class', () => {
        const result = VisibilityValidator.validateTypeVisibility(
          mockTypeInfo('MyClass', 'private'),
          { ...mockValidationScope(), currentType: { name: 'OtherClass' } },
        );
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('type.not.visible');
      });

      it('should validate protected type access from subclass', () => {
        const result = VisibilityValidator.validateTypeVisibility(
          mockTypeInfo('ParentClass', 'protected'),
          {
            ...mockValidationScope(),
            currentType: { name: 'ChildClass', parentType: 'ParentClass' },
          },
        );
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject protected type access from unrelated class', () => {
        const result = VisibilityValidator.validateTypeVisibility(
          mockTypeInfo('ParentClass', 'protected'),
          {
            ...mockValidationScope(),
            currentType: { name: 'UnrelatedClass' },
          },
        );
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('type.not.visible');
      });

      it('should validate global type access', () => {
        const result = VisibilityValidator.validateTypeVisibility(
          mockTypeInfo('MyClass', 'global'),
          mockValidationScope(),
        );
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate webservice type access', () => {
        const result = VisibilityValidator.validateTypeVisibility(
          mockTypeInfo('MyClass', 'webservice'),
          mockValidationScope(),
        );
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should handle type without visibility modifier', () => {
        const result = VisibilityValidator.validateTypeVisibility(
          mockTypeInfo('MyClass'),
          mockValidationScope(),
        );
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate interface type access', () => {
        const result = VisibilityValidator.validateTypeVisibility(
          mockTypeInfo('MyInterface', 'public'),
          mockValidationScope(),
        );
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate enum type access', () => {
        const result = VisibilityValidator.validateTypeVisibility(
          mockTypeInfo('MyEnum', 'public'),
          mockValidationScope(),
        );
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });
  });

  describe('Method Visibility Validation', () => {
    describe('validateMethodVisibility', () => {
      it('should validate public method access', () => {
        const result = VisibilityValidator.validateMethodVisibility(
          mockMethodInfo('myMethod', 'public'),
          mockValidationScope(),
        );
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate private method access within same class', () => {
        const result = VisibilityValidator.validateMethodVisibility(
          {
            ...mockMethodInfo('myMethod', 'private'),
            declaringType: 'MyClass',
          },
          { ...mockValidationScope(), currentType: { name: 'MyClass' } },
        );
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject private method access from different class', () => {
        const result = VisibilityValidator.validateMethodVisibility(
          {
            ...mockMethodInfo('myMethod', 'private'),
            declaringType: 'MyClass',
          },
          { ...mockValidationScope(), currentType: { name: 'OtherClass' } },
        );
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('method.not.visible');
      });

      it('should validate protected method access from subclass', () => {
        const result = VisibilityValidator.validateMethodVisibility(
          {
            ...mockMethodInfo('myMethod', 'protected'),
            declaringType: 'ParentClass',
          },
          {
            ...mockValidationScope(),
            currentType: { name: 'ChildClass', parentType: 'ParentClass' },
          },
        );
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject protected method access from unrelated class', () => {
        const result = VisibilityValidator.validateMethodVisibility(
          {
            ...mockMethodInfo('myMethod', 'protected'),
            declaringType: 'ParentClass',
          },
          {
            ...mockValidationScope(),
            currentType: { name: 'UnrelatedClass' },
          },
        );
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('method.not.visible');
      });

      it('should validate static method access in static context', () => {
        const result = VisibilityValidator.validateMethodVisibility(
          mockMethodInfo('myMethod', 'public', true),
          { ...mockValidationScope(), isStaticContext: true },
        );
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject static method access in instance context', () => {
        const result = VisibilityValidator.validateMethodVisibility(
          mockMethodInfo('myMethod', 'public', true),
          { ...mockValidationScope(), isStaticContext: false },
        );
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('static.method.in.instance.context');
      });

      it('should validate instance method access in instance context', () => {
        const result = VisibilityValidator.validateMethodVisibility(
          mockMethodInfo('myMethod', 'public', false),
          { ...mockValidationScope(), isStaticContext: false },
        );
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate instance method access in static context', () => {
        const result = VisibilityValidator.validateMethodVisibility(
          mockMethodInfo('myMethod', 'public', false),
          { ...mockValidationScope(), isStaticContext: true },
        );
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate global method access', () => {
        const result = VisibilityValidator.validateMethodVisibility(
          mockMethodInfo('myMethod', 'global'),
          mockValidationScope(),
        );
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate webservice method access', () => {
        const result = VisibilityValidator.validateMethodVisibility(
          mockMethodInfo('myMethod', 'webservice'),
          mockValidationScope(),
        );
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should handle method without visibility modifier', () => {
        const result = VisibilityValidator.validateMethodVisibility(
          mockMethodInfo('myMethod'),
          mockValidationScope(),
        );
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate interface method access', () => {
        const result = VisibilityValidator.validateMethodVisibility(
          mockMethodInfo('myMethod', 'public'),
          {
            ...mockValidationScope(),
            currentType: { name: 'MyInterface', isInterface: true },
          },
        );
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });
  });

  describe('Variable Visibility Validation', () => {
    describe('validateVariableVisibility', () => {
      it('should validate public variable access', () => {
        const result = VisibilityValidator.validateVariableVisibility(
          mockVariableInfo('myVar', 'public'),
          mockValidationScope(),
        );
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate private variable access within same class', () => {
        const result = VisibilityValidator.validateVariableVisibility(
          { ...mockVariableInfo('myVar', 'private'), declaringType: 'MyClass' },
          { ...mockValidationScope(), currentType: { name: 'MyClass' } },
        );
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject private variable access from different class', () => {
        const result = VisibilityValidator.validateVariableVisibility(
          { ...mockVariableInfo('myVar', 'private'), declaringType: 'MyClass' },
          { ...mockValidationScope(), currentType: { name: 'OtherClass' } },
        );
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('variable.not.visible');
      });

      it('should validate protected variable access from subclass', () => {
        const result = VisibilityValidator.validateVariableVisibility(
          {
            ...mockVariableInfo('myVar', 'protected'),
            declaringType: 'ParentClass',
          },
          {
            ...mockValidationScope(),
            currentType: { name: 'ChildClass', parentType: 'ParentClass' },
          },
        );
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject protected variable access from unrelated class', () => {
        const result = VisibilityValidator.validateVariableVisibility(
          {
            ...mockVariableInfo('myVar', 'protected'),
            declaringType: 'ParentClass',
          },
          {
            ...mockValidationScope(),
            currentType: { name: 'UnrelatedClass' },
          },
        );
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('variable.not.visible');
      });

      it('should validate static variable access in static context', () => {
        const result = VisibilityValidator.validateVariableVisibility(
          mockVariableInfo('myVar', 'public', true),
          { ...mockValidationScope(), isStaticContext: true },
        );
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject static variable access in instance context', () => {
        const result = VisibilityValidator.validateVariableVisibility(
          mockVariableInfo('myVar', 'public', true),
          { ...mockValidationScope(), isStaticContext: false },
        );
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('static.variable.in.instance.context');
      });

      it('should validate instance variable access in instance context', () => {
        const result = VisibilityValidator.validateVariableVisibility(
          mockVariableInfo('myVar', 'public', false),
          { ...mockValidationScope(), isStaticContext: false },
        );
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate instance variable access in static context', () => {
        const result = VisibilityValidator.validateVariableVisibility(
          mockVariableInfo('myVar', 'public', false),
          { ...mockValidationScope(), isStaticContext: true },
        );
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate global variable access', () => {
        const result = VisibilityValidator.validateVariableVisibility(
          mockVariableInfo('myVar', 'global'),
          mockValidationScope(),
        );
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should handle variable without visibility modifier', () => {
        const result = VisibilityValidator.validateVariableVisibility(
          mockVariableInfo('myVar'),
          mockValidationScope(),
        );
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate final variable access', () => {
        const result = VisibilityValidator.validateVariableVisibility(
          { ...mockVariableInfo('myVar', 'public'), isFinal: true },
          mockValidationScope(),
        );
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate constant variable access', () => {
        const result = VisibilityValidator.validateVariableVisibility(
          { ...mockVariableInfo('myVar', 'public'), isConstant: true },
          mockValidationScope(),
        );
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });
  });

  describe('Complete Visibility Validation', () => {
    describe('validateVisibility', () => {
      it('should validate complete class with all visibility rules', () => {
        const classInfo = {
          name: 'TestClass',
          visibility: 'public',
          methods: [
            {
              name: 'publicMethod',
              visibility: 'public',
              declaringType: 'TestClass',
            },
            {
              name: 'privateMethod',
              visibility: 'private',
              declaringType: 'TestClass',
            },
          ],
          variables: [
            {
              name: 'publicVar',
              visibility: 'public',
              declaringType: 'TestClass',
            },
            {
              name: 'privateVar',
              visibility: 'private',
              declaringType: 'TestClass',
            },
          ],
        };

        const result = VisibilityValidator.validateVisibility(classInfo, {
          ...mockValidationScope(),
          currentType: { name: 'TestClass' },
        });

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should detect multiple visibility violations', () => {
        const classInfo = {
          name: 'TestClass',
          visibility: 'private',
          methods: [{ name: 'privateMethod', visibility: 'private' }],
          variables: [{ name: 'privateVar', visibility: 'private' }],
        };

        const result = VisibilityValidator.validateVisibility(classInfo, {
          ...mockValidationScope(),
          currentType: { name: 'OtherClass' },
        });

        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });

      it('should validate inheritance relationships', () => {
        const parentClass = {
          name: 'ParentClass',
          visibility: 'public',
          methods: [{ name: 'protectedMethod', visibility: 'protected' }],
          variables: [{ name: 'protectedVar', visibility: 'protected' }],
        };

        const childClass = {
          name: 'ChildClass',
          parentType: 'ParentClass',
          visibility: 'public',
        };

        const result = VisibilityValidator.validateVisibility(parentClass, {
          ...mockValidationScope(),
          currentType: childClass,
        });

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate interface implementation', () => {
        const interfaceInfo = {
          name: 'MyInterface',
          visibility: 'public',
          isInterface: true,
          methods: [{ name: 'interfaceMethod', visibility: 'public' }],
        };

        const implementingClass = {
          name: 'ImplementingClass',
          implements: ['MyInterface'],
          visibility: 'public',
        };

        const result = VisibilityValidator.validateVisibility(interfaceInfo, {
          ...mockValidationScope(),
          currentType: implementingClass,
        });

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });
  });
});
