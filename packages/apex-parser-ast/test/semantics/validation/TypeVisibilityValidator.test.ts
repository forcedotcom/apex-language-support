/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { TypeVisibilityValidator } from '../../../src/semantics/validation/TypeVisibilityValidator';
import { SymbolVisibility } from '../../../src/types/symbol';
import type {
  ValidationScope,
  TypeValidationContext,
} from '../../../src/semantics/validation/TypeValidator';

describe('TypeVisibilityValidator', () => {
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
      blockDepth: 0,
      currentNamespace: null,
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

  const createMockType = (
    name: string,
    visibility: SymbolVisibility,
    namespace: string | null = null,
  ) => ({
    name,
    namespace: namespace ? { name: namespace } : null,
    visibility,
    isPrimitive: false,
    isSObject: false,
    isCollection: false,
  });

  const createMockContext = (
    namespace: string | null = null,
  ): TypeValidationContext => ({
    currentType: null,
    currentMethod: null,
    currentNamespace: namespace,
    isStaticContext: false,
    compilationContext: {
      namespace: namespace ? { name: namespace } : null,
      version: 58,
      isTrusted: true,
      sourceType: 'FILE',
      referencingType: null,
      enclosingTypes: [],
      parentTypes: [],
      isStaticContext: false,
    },
  });

  describe('validateTypeVisibility', () => {
    it('should allow access to public types from any namespace', () => {
      const targetType = createMockType(
        'TestClass',
        SymbolVisibility.Public,
        'otherNamespace',
      );
      const context = createMockContext('currentNamespace');

      const result = TypeVisibilityValidator.validateTypeVisibility(
        targetType,
        context,
        createMockScope(),
      );

      expect(result.isValid).toBe(true);
    });

    it('should allow access to types in same namespace', () => {
      const targetType = createMockType(
        'TestClass',
        SymbolVisibility.Private,
        'currentNamespace',
      );
      const context = createMockContext('currentNamespace');

      const result = TypeVisibilityValidator.validateTypeVisibility(
        targetType,
        context,
        createMockScope(),
      );

      expect(result.isValid).toBe(true);
    });

    it('should reject access to private types from different namespace', () => {
      const targetType = createMockType(
        'TestClass',
        SymbolVisibility.Private,
        'otherNamespace',
      );
      const context = createMockContext('currentNamespace');

      const result = TypeVisibilityValidator.validateTypeVisibility(
        targetType,
        context,
        createMockScope(),
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('type.not.visible');
    });

    it('should reject access to protected types from different namespace', () => {
      const targetType = createMockType(
        'TestClass',
        SymbolVisibility.Protected,
        'otherNamespace',
      );
      const context = createMockContext('currentNamespace');

      const result = TypeVisibilityValidator.validateTypeVisibility(
        targetType,
        context,
        createMockScope(),
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('type.not.visible');
    });

    it('should allow access to global types from any namespace', () => {
      const targetType = createMockType(
        'TestClass',
        SymbolVisibility.Global,
        'otherNamespace',
      );
      const context = createMockContext('currentNamespace');

      const result = TypeVisibilityValidator.validateTypeVisibility(
        targetType,
        context,
        createMockScope(),
      );

      expect(result.isValid).toBe(true);
    });

    it('should allow access to types when no namespace is involved', () => {
      const targetType = createMockType(
        'TestClass',
        SymbolVisibility.Private,
        null,
      );
      const context = createMockContext(null);

      const result = TypeVisibilityValidator.validateTypeVisibility(
        targetType,
        context,
        createMockScope(),
      );

      expect(result.isValid).toBe(true);
    });

    it('should allow access to types when target has no namespace', () => {
      const targetType = createMockType(
        'TestClass',
        SymbolVisibility.Private,
        null,
      );
      const context = createMockContext('currentNamespace');

      const result = TypeVisibilityValidator.validateTypeVisibility(
        targetType,
        context,
        createMockScope(),
      );

      expect(result.isValid).toBe(true);
    });
  });
});
