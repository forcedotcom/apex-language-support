/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect } from 'effect';
import {
  ValidatorRegistryLive,
  registerValidator,
  runValidatorsForTier,
} from '../../../../src/semantics/validation/ValidatorRegistry';
import { EffectTestLoggerLive } from '../../../../src/utils/EffectLspLoggerLayer';
import { ParameterLimitValidator } from '../../../../src/semantics/validation/validators/ParameterLimitValidator';
import { EnumLimitValidator } from '../../../../src/semantics/validation/validators/EnumLimitValidator';
// eslint-disable-next-line max-len
import { EnumConstantNamingValidator } from '../../../../src/semantics/validation/validators/EnumConstantNamingValidator';
import { DuplicateMethodValidator } from '../../../../src/semantics/validation/validators/DuplicateMethodValidator';
import { ConstructorNamingValidator } from '../../../../src/semantics/validation/validators/ConstructorNamingValidator';

import { TypeSelfReferenceValidator } from '../../../../src/semantics/validation/validators/TypeSelfReferenceValidator';
// eslint-disable-next-line max-len
import { AbstractMethodBodyValidator } from '../../../../src/semantics/validation/validators/AbstractMethodBodyValidator';
import { VariableShadowingValidator } from '../../../../src/semantics/validation/validators/VariableShadowingValidator';
import { ForwardReferenceValidator } from '../../../../src/semantics/validation/validators/ForwardReferenceValidator';
import { FinalAssignmentValidator } from '../../../../src/semantics/validation/validators/FinalAssignmentValidator';
// eslint-disable-next-line max-len
import { MethodSignatureEquivalenceValidator } from '../../../../src/semantics/validation/validators/MethodSignatureEquivalenceValidator';
// eslint-disable-next-line max-len
import { InterfaceHierarchyValidator } from '../../../../src/semantics/validation/validators/InterfaceHierarchyValidator';
import { ClassHierarchyValidator } from '../../../../src/semantics/validation/validators/ClassHierarchyValidator';
import { TypeAssignmentValidator } from '../../../../src/semantics/validation/validators/TypeAssignmentValidator';
import {
  SymbolTable,
  SymbolFactory,
  SymbolKind,
} from '../../../../src/types/symbol';
import { ValidationTier } from '../../../../src/semantics/validation/ValidationTier';

describe('Validator Integration Tests', () => {
  const TEST_FILE_URI = 'file:///test.cls';

  // Helper to extract error/warning message (handles both string and object formats)
  const getMessage = (errorOrWarning: string | { message: string }): string =>
    typeof errorOrWarning === 'string'
      ? errorOrWarning
      : errorOrWarning.message;

  /**
   * Create a program that registers all validators and runs them
   */
  function createTestProgram() {
    return Effect.gen(function* () {
      // Register all twelve validators (10 TIER 1, 2 TIER 2)

      // TIER 1 (IMMEDIATE) validators
      yield* registerValidator(ParameterLimitValidator);
      yield* registerValidator(EnumLimitValidator);
      yield* registerValidator(EnumConstantNamingValidator);
      yield* registerValidator(DuplicateMethodValidator);
      yield* registerValidator(ConstructorNamingValidator);
      yield* registerValidator(TypeSelfReferenceValidator);
      yield* registerValidator(AbstractMethodBodyValidator);
      yield* registerValidator(VariableShadowingValidator);
      yield* registerValidator(ForwardReferenceValidator);
      yield* registerValidator(FinalAssignmentValidator);

      // TIER 2 (THOROUGH) validators
      yield* registerValidator(MethodSignatureEquivalenceValidator);
      yield* registerValidator(InterfaceHierarchyValidator);
      yield* registerValidator(ClassHierarchyValidator);
      yield* registerValidator(TypeAssignmentValidator);

      return 'Validators registered';
    }).pipe(Effect.provide(ValidatorRegistryLive));
  }

  beforeEach(async () => {
    // Register validators before each test
    await Effect.runPromise(createTestProgram());
  });

  it('should register and run all IMMEDIATE tier validators successfully', async () => {
    const symbolTable = new SymbolTable();
    symbolTable.setFileUri(TEST_FILE_URI);

    // Create a simple class with a method
    const classSymbol = SymbolFactory.createMinimalSymbol(
      'TestClass',
      SymbolKind.Class,
      { line: 1, column: 0, endLine: 10, endColumn: 0 },
      TEST_FILE_URI,
      null,
    );
    symbolTable.addSymbol(classSymbol, null);

    const methodSymbol = SymbolFactory.createMinimalSymbol(
      'testMethod',
      SymbolKind.Method,
      { line: 2, column: 2, endLine: 4, endColumn: 2 },
      TEST_FILE_URI,
      classSymbol.id,
    );
    symbolTable.addSymbol(methodSymbol, classSymbol);

    // Run all IMMEDIATE tier validators
    const results = await Effect.runPromise(
      runValidatorsForTier(ValidationTier.IMMEDIATE, symbolTable, {
        tier: ValidationTier.IMMEDIATE,
        allowArtifactLoading: false,
        maxDepth: 1,
        maxArtifacts: 5,
        timeout: 5000,
      }).pipe(
        Effect.provide(ValidatorRegistryLive),
        Effect.provide(EffectTestLoggerLive),
      ),
    );

    // Should have 10 TIER 1 validators run
    expect(results).toHaveLength(10);

    // All should pass since we have valid code
    for (const result of results) {
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    }
  });

  it('should detect parameter limit violations', async () => {
    const symbolTable = createMethodWith33Parameters();

    const results = await Effect.runPromise(
      runValidatorsForTier(ValidationTier.IMMEDIATE, symbolTable, {
        tier: ValidationTier.IMMEDIATE,
        allowArtifactLoading: false,
        maxDepth: 1,
        maxArtifacts: 5,
        timeout: 5000,
      }).pipe(
        Effect.provide(ValidatorRegistryLive),
        Effect.provide(EffectTestLoggerLive),
      ),
    );

    // Find the ParameterLimitValidator result
    const parameterResult = results.find(
      (r) =>
        !r.isValid &&
        r.errors.length > 0 &&
        getMessage(r.errors[0]).includes('33 parameters'),
    );

    expect(parameterResult).toBeDefined();
    expect(parameterResult?.isValid).toBe(false);
    expect(parameterResult?.errors.length).toBeGreaterThan(0);
  });

  it('should detect enum constant limit violations', async () => {
    const symbolTable = createEnumWith101Constants();

    const results = await Effect.runPromise(
      runValidatorsForTier(ValidationTier.IMMEDIATE, symbolTable, {
        tier: ValidationTier.IMMEDIATE,
        allowArtifactLoading: false,
        maxDepth: 1,
        maxArtifacts: 5,
        timeout: 5000,
      }).pipe(
        Effect.provide(ValidatorRegistryLive),
        Effect.provide(EffectTestLoggerLive),
      ),
    );

    // Find the EnumLimitValidator result
    const enumLimitResult = results.find(
      (r) =>
        !r.isValid &&
        r.errors.length > 0 &&
        getMessage(r.errors[0]).includes('101 constants'),
    );

    expect(enumLimitResult).toBeDefined();
    expect(enumLimitResult?.isValid).toBe(false);
    expect(enumLimitResult?.errors.length).toBeGreaterThan(0);
  });

  it('should detect invalid enum constant names', async () => {
    const symbolTable = createEnumWithInvalidConstantName();

    const results = await Effect.runPromise(
      runValidatorsForTier(ValidationTier.IMMEDIATE, symbolTable, {
        tier: ValidationTier.IMMEDIATE,
        allowArtifactLoading: false,
        maxDepth: 1,
        maxArtifacts: 5,
        timeout: 5000,
      }).pipe(
        Effect.provide(ValidatorRegistryLive),
        Effect.provide(EffectTestLoggerLive),
      ),
    );

    // Find the EnumConstantNamingValidator result
    const namingResult = results.find(
      (r) =>
        !r.isValid &&
        r.errors.length > 0 &&
        getMessage(r.errors[0]).includes('INVALID@NAME'),
    );

    expect(namingResult).toBeDefined();
    expect(namingResult?.isValid).toBe(false);
    expect(namingResult?.errors.length).toBeGreaterThan(0);
  });

  it('should detect duplicate method names', async () => {
    const symbolTable = createClassWithDuplicateMethods();

    const results = await Effect.runPromise(
      runValidatorsForTier(ValidationTier.IMMEDIATE, symbolTable, {
        tier: ValidationTier.IMMEDIATE,
        allowArtifactLoading: false,
        maxDepth: 1,
        maxArtifacts: 5,
        timeout: 5000,
      }).pipe(
        Effect.provide(ValidatorRegistryLive),
        Effect.provide(EffectTestLoggerLive),
      ),
    );

    // Find the DuplicateMethodValidator result
    const duplicateResult = results.find(
      (r) =>
        !r.isValid &&
        r.errors.length > 0 &&
        getMessage(r.errors[0]).includes('Duplicate method'),
    );

    expect(duplicateResult).toBeDefined();
    expect(duplicateResult?.isValid).toBe(false);
    expect(duplicateResult?.errors.length).toBeGreaterThan(0);
  });

  it('should detect invalid constructor names', async () => {
    const symbolTable = createClassWithInvalidConstructor();

    const results = await Effect.runPromise(
      runValidatorsForTier(ValidationTier.IMMEDIATE, symbolTable, {
        tier: ValidationTier.IMMEDIATE,
        allowArtifactLoading: false,
        maxDepth: 1,
        maxArtifacts: 5,
        timeout: 5000,
      }).pipe(
        Effect.provide(ValidatorRegistryLive),
        Effect.provide(EffectTestLoggerLive),
      ),
    );

    // Find the ConstructorNamingValidator result
    const constructorResult = results.find(
      (r) =>
        !r.isValid &&
        r.errors.length > 0 &&
        getMessage(r.errors[0]).includes('Constructor name'),
    );

    expect(constructorResult).toBeDefined();
    expect(constructorResult?.isValid).toBe(false);
    expect(constructorResult?.errors.length).toBeGreaterThan(0);
  });

  it('should detect multiple violations in the same symbol table', async () => {
    const symbolTable = new SymbolTable();
    symbolTable.setFileUri(TEST_FILE_URI);

    // Add a class
    const classSymbol = SymbolFactory.createMinimalSymbol(
      'MyClass',
      SymbolKind.Class,
      { line: 1, column: 0, endLine: 50, endColumn: 0 },
      TEST_FILE_URI,
      null,
    );
    symbolTable.addSymbol(classSymbol, null);

    // Add a method with 33 parameters (violates ParameterLimitValidator)
    const methodSymbol = SymbolFactory.createMinimalSymbol(
      'badMethod',
      SymbolKind.Method,
      { line: 2, column: 2, endLine: 5, endColumn: 2 },
      TEST_FILE_URI,
      classSymbol.id,
    );
    symbolTable.addSymbol(methodSymbol, classSymbol);

    for (let i = 1; i <= 33; i++) {
      const paramSymbol = SymbolFactory.createMinimalSymbol(
        `param${i}`,
        SymbolKind.Parameter,
        { line: 2, column: 10 + i, endLine: 2, endColumn: 10 + i },
        TEST_FILE_URI,
        methodSymbol.id,
      );
      symbolTable.addSymbol(paramSymbol, methodSymbol);
    }

    // Add an enum with invalid constant name (violates EnumConstantNamingValidator)
    const enumSymbol = SymbolFactory.createMinimalSymbol(
      'Status',
      SymbolKind.Enum,
      { line: 20, column: 0, endLine: 25, endColumn: 0 },
      TEST_FILE_URI,
      null,
    );
    symbolTable.addSymbol(enumSymbol, null);

    const invalidConstant = SymbolFactory.createMinimalSymbol(
      'BAD@NAME',
      SymbolKind.EnumValue,
      { line: 21, column: 2, endLine: 21, endColumn: 2 },
      TEST_FILE_URI,
      enumSymbol.id,
    );
    symbolTable.addSymbol(invalidConstant, enumSymbol);

    // Run all validators
    const results = await Effect.runPromise(
      runValidatorsForTier(ValidationTier.IMMEDIATE, symbolTable, {
        tier: ValidationTier.IMMEDIATE,
        allowArtifactLoading: false,
        maxDepth: 1,
        maxArtifacts: 5,
        timeout: 5000,
      }).pipe(
        Effect.provide(ValidatorRegistryLive),
        Effect.provide(EffectTestLoggerLive),
      ),
    );

    // Should have at least 2 validators report errors
    const failedValidators = results.filter((r) => !r.isValid);
    expect(failedValidators.length).toBeGreaterThanOrEqual(2);

    // Check for specific error messages
    const allErrors = results.flatMap((r) => r.errors);
    expect(allErrors.some((e) => getMessage(e).includes('33 parameters'))).toBe(
      true,
    );
    expect(allErrors.some((e) => getMessage(e).includes('BAD@NAME'))).toBe(
      true,
    );
  });

  it('should run THOROUGH tier validators successfully', async () => {
    const symbolTable = new SymbolTable();
    symbolTable.setFileUri(TEST_FILE_URI);

    // Create a simple class with a method
    const classSymbol = SymbolFactory.createMinimalSymbol(
      'TestClass',
      SymbolKind.Class,
      { line: 1, column: 0, endLine: 10, endColumn: 0 },
      TEST_FILE_URI,
      null,
    );
    symbolTable.addSymbol(classSymbol, null);

    const methodSymbol = SymbolFactory.createMinimalSymbol(
      'testMethod',
      SymbolKind.Method,
      { line: 2, column: 2, endLine: 4, endColumn: 2 },
      TEST_FILE_URI,
      classSymbol.id,
    );
    symbolTable.addSymbol(methodSymbol, classSymbol);

    // Run all THOROUGH tier validators
    const results = await Effect.runPromise(
      runValidatorsForTier(ValidationTier.THOROUGH, symbolTable, {
        tier: ValidationTier.THOROUGH,
        allowArtifactLoading: false,
        maxDepth: 1,
        maxArtifacts: 5,
        timeout: 5000,
      }).pipe(
        Effect.provide(ValidatorRegistryLive),
        Effect.provide(EffectTestLoggerLive),
      ),
    );

    // Should have 4 TIER 2 validators run
    // (MethodSignatureEquivalence, InterfaceHierarchy, ClassHierarchy, TypeAssignment)
    expect(results).toHaveLength(4);

    // All should pass since we have valid code
    for (const result of results) {
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    }
  });

  // Helper functions to create test symbol tables

  function createMethodWith33Parameters(): SymbolTable {
    const symbolTable = new SymbolTable();
    symbolTable.setFileUri(TEST_FILE_URI);

    const classSymbol = SymbolFactory.createMinimalSymbol(
      'TestClass',
      SymbolKind.Class,
      { line: 1, column: 0, endLine: 10, endColumn: 0 },
      TEST_FILE_URI,
      null,
    );
    symbolTable.addSymbol(classSymbol, null);

    const methodSymbol = SymbolFactory.createMinimalSymbol(
      'tooManyParams',
      SymbolKind.Method,
      { line: 2, column: 2, endLine: 4, endColumn: 2 },
      TEST_FILE_URI,
      classSymbol.id,
    );
    symbolTable.addSymbol(methodSymbol, classSymbol);

    // Add 33 parameters
    for (let i = 1; i <= 33; i++) {
      const paramSymbol = SymbolFactory.createMinimalSymbol(
        `param${i}`,
        SymbolKind.Parameter,
        { line: 2, column: 10 + i, endLine: 2, endColumn: 10 + i },
        TEST_FILE_URI,
        methodSymbol.id,
      );
      symbolTable.addSymbol(paramSymbol, methodSymbol);
    }

    return symbolTable;
  }

  function createEnumWith101Constants(): SymbolTable {
    const symbolTable = new SymbolTable();
    symbolTable.setFileUri(TEST_FILE_URI);

    const enumSymbol = SymbolFactory.createMinimalSymbol(
      'LargeEnum',
      SymbolKind.Enum,
      { line: 1, column: 0, endLine: 110, endColumn: 0 },
      TEST_FILE_URI,
      null,
    );
    symbolTable.addSymbol(enumSymbol, null);

    // Add 101 constants
    for (let i = 1; i <= 101; i++) {
      const constantSymbol = SymbolFactory.createMinimalSymbol(
        `VALUE_${i}`,
        SymbolKind.EnumValue,
        { line: i + 1, column: 2, endLine: i + 1, endColumn: 2 },
        TEST_FILE_URI,
        enumSymbol.id,
      );
      symbolTable.addSymbol(constantSymbol, enumSymbol);
    }

    return symbolTable;
  }

  function createEnumWithInvalidConstantName(): SymbolTable {
    const symbolTable = new SymbolTable();
    symbolTable.setFileUri(TEST_FILE_URI);

    const enumSymbol = SymbolFactory.createMinimalSymbol(
      'Status',
      SymbolKind.Enum,
      { line: 1, column: 0, endLine: 5, endColumn: 0 },
      TEST_FILE_URI,
      null,
    );
    symbolTable.addSymbol(enumSymbol, null);

    const invalidConstant = SymbolFactory.createMinimalSymbol(
      'INVALID@NAME',
      SymbolKind.EnumValue,
      { line: 2, column: 2, endLine: 2, endColumn: 2 },
      TEST_FILE_URI,
      enumSymbol.id,
    );
    symbolTable.addSymbol(invalidConstant, enumSymbol);

    return symbolTable;
  }

  function createClassWithDuplicateMethods(): SymbolTable {
    const symbolTable = new SymbolTable();
    symbolTable.setFileUri(TEST_FILE_URI);

    const classSymbol = SymbolFactory.createMinimalSymbol(
      'MyClass',
      SymbolKind.Class,
      {
        symbolRange: {
          startLine: 1,
          startColumn: 0,
          endLine: 10,
          endColumn: 0,
        },
        identifierRange: {
          startLine: 1,
          startColumn: 0,
          endLine: 1,
          endColumn: 7,
        },
      },
      TEST_FILE_URI,
      null,
    );
    symbolTable.addSymbol(classSymbol, null);

    // Add first method
    const method1 = SymbolFactory.createMinimalSymbol(
      'doWork',
      SymbolKind.Method,
      {
        symbolRange: {
          startLine: 2,
          startColumn: 2,
          endLine: 4,
          endColumn: 2,
        },
        identifierRange: {
          startLine: 2,
          startColumn: 2,
          endLine: 2,
          endColumn: 8,
        },
      },
      TEST_FILE_URI,
      classSymbol.id,
      undefined,
      ['MyClass', 'doWork_0'],
    );
    symbolTable.addSymbol(method1, classSymbol);

    // Add duplicate method with different case
    const method2 = SymbolFactory.createMinimalSymbol(
      'DoWork',
      SymbolKind.Method,
      {
        symbolRange: {
          startLine: 5,
          startColumn: 2,
          endLine: 7,
          endColumn: 2,
        },
        identifierRange: {
          startLine: 5,
          startColumn: 2,
          endLine: 5,
          endColumn: 8,
        },
      },
      TEST_FILE_URI,
      classSymbol.id,
      undefined,
      ['MyClass', 'DoWork_1'],
    );
    symbolTable.addSymbol(method2, classSymbol);

    return symbolTable;
  }

  function createClassWithInvalidConstructor(): SymbolTable {
    const symbolTable = new SymbolTable();
    symbolTable.setFileUri(TEST_FILE_URI);

    const classSymbol = SymbolFactory.createMinimalSymbol(
      'MyClass',
      SymbolKind.Class,
      {
        symbolRange: {
          startLine: 1,
          startColumn: 0,
          endLine: 10,
          endColumn: 0,
        },
        identifierRange: {
          startLine: 1,
          startColumn: 0,
          endLine: 1,
          endColumn: 7,
        },
      },
      TEST_FILE_URI,
      null,
    );
    symbolTable.addSymbol(classSymbol, null);

    // Add constructor with wrong name
    const constructor = SymbolFactory.createMinimalSymbol(
      'WrongName',
      SymbolKind.Constructor,
      {
        symbolRange: {
          startLine: 2,
          startColumn: 2,
          endLine: 4,
          endColumn: 2,
        },
        identifierRange: {
          startLine: 2,
          startColumn: 2,
          endLine: 2,
          endColumn: 11,
        },
      },
      TEST_FILE_URI,
      classSymbol.id,
      undefined,
      ['MyClass', 'constructor'],
    );
    symbolTable.addSymbol(constructor, classSymbol);

    return symbolTable;
  }
});
