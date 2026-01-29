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
import {
  ParameterLimitValidator,
  EnumLimitValidator,
  EnumConstantNamingValidator,
  DuplicateMethodValidator,
  ConstructorNamingValidator,
  TypeSelfReferenceValidator,
  AbstractMethodBodyValidator,
  VariableShadowingValidator,
  ForwardReferenceValidator,
  FinalAssignmentValidator,
  MethodSignatureEquivalenceValidator,
  InterfaceHierarchyValidator,
  ClassHierarchyValidator,
  TypeAssignmentValidator,
} from '../../../../src/semantics/validation/validators';
import { SymbolTable } from '../../../../src/types/symbol';
import { ValidationTier } from '../../../../src/semantics/validation/ValidationTier';
import { ApexSymbolManager } from '../../../../src/symbols/ApexSymbolManager';
import { CompilerService } from '../../../../src/parser/compilerService';
import {
  compileFixture,
  getMessage,
  createValidationOptions,
} from './helpers/validation-test-helpers';

describe('Validator Integration Tests', () => {
  let symbolManager: ApexSymbolManager;
  let compilerService: CompilerService;

  beforeEach(() => {
    symbolManager = new ApexSymbolManager();
    compilerService = new CompilerService();
  });

  afterEach(() => {
    symbolManager.clear();
  });

  const VALIDATOR_CATEGORY = 'integration';

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
    const symbolTable = await compileFixture(
      VALIDATOR_CATEGORY,
      'ValidClass.cls',
      undefined,
      symbolManager,
      compilerService,
    );

    // Run all IMMEDIATE tier validators
    const results = await Effect.runPromise(
      runValidatorsForTier(
        ValidationTier.IMMEDIATE,
        symbolTable,
        createValidationOptions(symbolManager, {
          tier: ValidationTier.IMMEDIATE,
          allowArtifactLoading: false,
        }),
      ).pipe(
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
    const symbolTable = await compileFixture(
      'parameter-limit',
      'MethodWith33Params.cls',
      undefined,
      symbolManager,
      compilerService,
    );

    const results = await Effect.runPromise(
      runValidatorsForTier(
        ValidationTier.IMMEDIATE,
        symbolTable,
        createValidationOptions(symbolManager, {
          tier: ValidationTier.IMMEDIATE,
          allowArtifactLoading: false,
        }),
      ).pipe(
        Effect.provide(ValidatorRegistryLive),
        Effect.provide(EffectTestLoggerLive),
      ),
    );

    // Find the ParameterLimitValidator result
    const parameterResult = results.find(
      (r) =>
        !r.isValid &&
        r.errors.length > 0 &&
        (getMessage(r.errors[0]).includes('Invalid number of parameters') ||
          getMessage(r.errors[0]).includes('33')),
    );

    expect(parameterResult).toBeDefined();
    expect(parameterResult?.isValid).toBe(false);
    expect(parameterResult?.errors.length).toBeGreaterThan(0);
  });

  it('should detect enum constant limit violations', async () => {
    const symbolTable = await compileFixture(
      'enum-limit',
      'InvalidEnum.cls',
      undefined,
      symbolManager,
      compilerService,
    );

    const results = await Effect.runPromise(
      runValidatorsForTier(
        ValidationTier.IMMEDIATE,
        symbolTable,
        createValidationOptions(symbolManager, {
          tier: ValidationTier.IMMEDIATE,
          allowArtifactLoading: false,
        }),
      ).pipe(
        Effect.provide(ValidatorRegistryLive),
        Effect.provide(EffectTestLoggerLive),
      ),
    );

    // Find the EnumLimitValidator result
    const enumLimitResult = results.find(
      (r) =>
        !r.isValid &&
        r.errors.length > 0 &&
        (getMessage(r.errors[0]).includes('Maximum number of enum') ||
          getMessage(r.errors[0]).includes('100')),
    );

    expect(enumLimitResult).toBeDefined();
    expect(enumLimitResult?.isValid).toBe(false);
    expect(enumLimitResult?.errors.length).toBeGreaterThan(0);
  });

  it('should detect invalid enum constant names', async () => {
    const symbolTable = await compileFixture(
      VALIDATOR_CATEGORY,
      'EnumWithInvalidConstant.cls',
      undefined,
      symbolManager,
      compilerService,
    );

    const results = await Effect.runPromise(
      runValidatorsForTier(
        ValidationTier.IMMEDIATE,
        symbolTable,
        createValidationOptions(symbolManager, {
          tier: ValidationTier.IMMEDIATE,
          allowArtifactLoading: false,
        }),
      ).pipe(
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
    const symbolTable = await compileFixture(
      'duplicate-method',
      'DuplicateDifferentCase.cls',
      undefined,
      symbolManager,
      compilerService,
    );

    const results = await Effect.runPromise(
      runValidatorsForTier(
        ValidationTier.IMMEDIATE,
        symbolTable,
        createValidationOptions(symbolManager, {
          tier: ValidationTier.IMMEDIATE,
          allowArtifactLoading: false,
        }),
      ).pipe(
        Effect.provide(ValidatorRegistryLive),
        Effect.provide(EffectTestLoggerLive),
      ),
    );

    // Find the DuplicateMethodValidator result
    const duplicateResult = results.find(
      (r) =>
        !r.isValid &&
        r.errors.length > 0 &&
        (getMessage(r.errors[0]).includes('Method already defined') ||
          getMessage(r.errors[0]).includes('method already exists')),
    );

    expect(duplicateResult).toBeDefined();
    expect(duplicateResult?.isValid).toBe(false);
    expect(duplicateResult?.errors.length).toBeGreaterThan(0);
  });

  it.skip('should detect invalid constructor names', async () => {
    // Note: Constructor name mismatches are caught by the parser as syntax errors
    // before the validator can check them, so this test cannot be executed with real compilation.
    const symbolTable = await compileFixture(
      'constructor-naming',
      'NonMatchingName.cls',
      undefined,
      symbolManager,
      compilerService,
    );

    const results = await Effect.runPromise(
      runValidatorsForTier(
        ValidationTier.IMMEDIATE,
        symbolTable,
        createValidationOptions(symbolManager, {
          tier: ValidationTier.IMMEDIATE,
          allowArtifactLoading: false,
        }),
      ).pipe(
        Effect.provide(ValidatorRegistryLive),
        Effect.provide(EffectTestLoggerLive),
      ),
    );

    // Find the ConstructorNamingValidator result
    const constructorResult = results.find(
      (r) =>
        !r.isValid &&
        r.errors.length > 0 &&
        (getMessage(r.errors[0]).includes('Constructor name') ||
          getMessage(r.errors[0]).includes('must match') ||
          getMessage(r.errors[0]).includes('constructor')),
    );

    expect(constructorResult).toBeDefined();
    expect(constructorResult?.isValid).toBe(false);
    expect(constructorResult?.errors.length).toBeGreaterThan(0);
  });

  it.skip('should detect multiple violations in the same symbol table', async () => {
    // Note: Invalid characters like '@' in method names are caught by the parser
    // as syntax errors before the validator can check them, so this test cannot be executed
    // with real compilation. The method name with '@' prevents compilation.
    // This test would need to be rewritten to use valid syntax that triggers multiple validators.
    const symbolTable = await compileFixture(
      VALIDATOR_CATEGORY,
      'MultipleViolations.cls',
      undefined,
      symbolManager,
      compilerService,
    );

    // Run all validators
    const results = await Effect.runPromise(
      runValidatorsForTier(
        ValidationTier.IMMEDIATE,
        symbolTable,
        createValidationOptions(symbolManager, {
          tier: ValidationTier.IMMEDIATE,
          allowArtifactLoading: false,
        }),
      ).pipe(
        Effect.provide(ValidatorRegistryLive),
        Effect.provide(EffectTestLoggerLive),
      ),
    );

    // Should have at least 2 validators report errors
    const failedValidators = results.filter((r) => !r.isValid);
    expect(failedValidators.length).toBeGreaterThanOrEqual(2);

    // Check for specific error messages
    const allErrors = results.flatMap((r) => r.errors);
    expect(
      allErrors.some(
        (e) =>
          getMessage(e).includes('Invalid number of parameters') ||
          getMessage(e).includes('33'),
      ),
    ).toBe(true);
  });

  it('should run THOROUGH tier validators successfully', async () => {
    const symbolTable = await compileFixture(
      VALIDATOR_CATEGORY,
      'ValidClass.cls',
      undefined,
      symbolManager,
      compilerService,
    );

    // Run all THOROUGH tier validators
    const results = await Effect.runPromise(
      runValidatorsForTier(
        ValidationTier.THOROUGH,
        symbolTable,
        createValidationOptions(symbolManager, {
          tier: ValidationTier.THOROUGH,
          allowArtifactLoading: false,
        }),
      ).pipe(
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

});
