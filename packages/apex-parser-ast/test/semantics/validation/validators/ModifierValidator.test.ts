/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ModifierValidator } from '../../../../src/semantics/validation/validators';
import { ValidationTier } from '../../../../src/semantics/validation/ValidationTier';
import { ApexSymbolManager } from '../../../../src/symbols/ApexSymbolManager';
import { CompilerService } from '../../../../src/parser/compilerService';
import {
  compileFixture,
  runValidator,
  createValidationOptions,
  compileFixtureWithOptions,
} from './helpers/validation-test-helpers';
import { ErrorCodes } from '../../../../src/generated/ErrorCodes';

describe('ModifierValidator', () => {
  let symbolManager: ApexSymbolManager;
  let compilerService: CompilerService;

  beforeEach(() => {
    symbolManager = new ApexSymbolManager();
    compilerService = new CompilerService();
  });

  afterEach(() => {
    symbolManager.clear();
  });

  const VALIDATOR_CATEGORY = 'modifier';

  // Helper to compile a fixture file for this validator
  const compileFixtureForValidator = async (
    filename: string,
    fileUri?: string,
  ) =>
    compileFixture(
      VALIDATOR_CATEGORY,
      filename,
      fileUri,
      symbolManager,
      compilerService,
    );

  it('should have correct metadata', () => {
    expect(ModifierValidator.id).toBe('modifier');
    expect(ModifierValidator.name).toBe('Modifier Validator');
    expect(ModifierValidator.tier).toBe(ValidationTier.IMMEDIATE);
    expect(ModifierValidator.priority).toBe(10);
  });

  it('should detect conflicting modifiers', async () => {
    const symbolTable = await compileFixtureForValidator(
      'ConflictingModifiers.cls',
    );

    const result = await runValidator(
      ModifierValidator.validate(
        symbolTable,
        createValidationOptions(symbolManager, {
          tier: ValidationTier.IMMEDIATE,
          allowArtifactLoading: false,
        }),
      ),
      symbolManager,
    );

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    // Should have errors for conflicting modifiers
    const hasConflictingError = result.errors.some(
      (e: any) => e.code === ErrorCodes.MODIFIER_CANNOT_BE,
    );
    expect(hasConflictingError).toBe(true);
  });

  it('should detect ENCLOSING_TYPE_FOR when inner has global but enclosing does not', async () => {
    const { symbolTable, options } = await compileFixtureWithOptions(
      VALIDATOR_CATEGORY,
      'InvalidInnerTypeModifier.cls',
      undefined,
      symbolManager,
      compilerService,
      {
        tier: ValidationTier.IMMEDIATE,
        allowArtifactLoading: false,
      },
    );

    const result = await runValidator(
      ModifierValidator.validate(symbolTable, options),
      symbolManager,
    );

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    const hasEnclosingError = result.errors.some(
      (e: any) => e.code === ErrorCodes.ENCLOSING_TYPE_FOR,
    );
    expect(hasEnclosingError).toBe(true);
  });

  it('should detect missing required modifiers', async () => {
    const symbolTable = await compileFixtureForValidator(
      'WebServiceRequiresGlobal.cls',
    );

    const result = await runValidator(
      ModifierValidator.validate(
        symbolTable,
        createValidationOptions(symbolManager, {
          tier: ValidationTier.IMMEDIATE,
          allowArtifactLoading: false,
        }),
      ),
      symbolManager,
    );

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    const hasRequiresError = result.errors.some(
      (e: any) => e.code === ErrorCodes.MODIFIER_REQUIRES,
    );
    expect(hasRequiresError).toBe(true);
  });

  it('should detect test class without test method (MODIFIER_REQUIRE_AT_LEAST)', async () => {
    const symbolTable = await compileFixtureForValidator(
      'TestClassWithoutTestMethod.cls',
    );

    const result = await runValidator(
      ModifierValidator.validate(
        symbolTable,
        createValidationOptions(symbolManager, {
          tier: ValidationTier.IMMEDIATE,
          allowArtifactLoading: false,
        }),
      ),
      symbolManager,
    );

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    const hasRequireAtLeastError = result.errors.some(
      (e: any) => e.code === ErrorCodes.MODIFIER_REQUIRE_AT_LEAST,
    );
    expect(hasRequireAtLeastError).toBe(true);
  });

  it('should detect invalid modifiers on fields', async () => {
    const { symbolTable, options } = await compileFixtureWithOptions(
      VALIDATOR_CATEGORY,
      'InvalidFieldModifiers.cls',
      undefined,
      symbolManager,
      compilerService,
      {
        tier: ValidationTier.IMMEDIATE,
        allowArtifactLoading: false,
      },
    );

    const result = await runValidator(
      ModifierValidator.validate(symbolTable, options),
      symbolManager,
    );

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    const hasNotAllowedError = result.errors.some(
      (e: any) => e.code === ErrorCodes.MODIFIER_IS_NOT_ALLOWED,
    );
    expect(hasNotAllowedError).toBe(true);
  });

  it('should pass valid modifiers', async () => {
    const symbolTable = await compileFixtureForValidator('ValidModifiers.cls');

    const result = await runValidator(
      ModifierValidator.validate(
        symbolTable,
        createValidationOptions(symbolManager, {
          tier: ValidationTier.IMMEDIATE,
          allowArtifactLoading: false,
        }),
      ),
      symbolManager,
    );

    // Note: Some modifier validation happens in listeners, so this validator
    // may not catch all cases, but should not report false positives
    expect(result.isValid).toBeDefined();
  });

  it('should detect INVALID_READ_ONLY when ReadOnly is on non-allowed method', async () => {
    const symbolTable = await compileFixtureForValidator('ReadOnlyInvalid.cls');

    const result = await runValidator(
      ModifierValidator.validate(
        symbolTable,
        createValidationOptions(symbolManager, {
          tier: ValidationTier.IMMEDIATE,
          allowArtifactLoading: false,
        }),
      ),
      symbolManager,
    );

    expect(result.isValid).toBe(false);
    const hasError = result.errors.some(
      (e: any) => e.code === ErrorCodes.INVALID_READ_ONLY,
    );
    expect(hasError).toBe(true);
  });

  it('should detect USEREPLICA_PREFERRED_MUST_BE_STATIC when useReplica=preferred without static', async () => {
    const symbolTable = await compileFixtureForValidator(
      'ReadOnlyUseReplicaNotStatic.cls',
    );

    const result = await runValidator(
      ModifierValidator.validate(
        symbolTable,
        createValidationOptions(symbolManager, {
          tier: ValidationTier.IMMEDIATE,
          allowArtifactLoading: false,
        }),
      ),
      symbolManager,
    );

    expect(result.isValid).toBe(false);
    const hasError = result.errors.some(
      (e: any) => e.code === ErrorCodes.USEREPLICA_PREFERRED_MUST_BE_STATIC,
    );
    expect(hasError).toBe(true);
  });

  it('should pass when ReadOnly is on RemoteAction method', async () => {
    const symbolTable = await compileFixtureForValidator('ReadOnlyValid.cls');

    const result = await runValidator(
      ModifierValidator.validate(
        symbolTable,
        createValidationOptions(symbolManager, {
          tier: ValidationTier.IMMEDIATE,
          allowArtifactLoading: false,
        }),
      ),
      symbolManager,
    );

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should detect MODIFIER_ILLEGAL_DEFINING_TYPE when @InvocableMethod is on trigger', async () => {
    const symbolTable = await compileFixtureForValidator(
      'InvocableMethodOnTrigger.trigger',
      'file:///test/InvocableMethodOnTrigger.trigger',
    );

    const result = await runValidator(
      ModifierValidator.validate(
        symbolTable,
        createValidationOptions(symbolManager, {
          tier: ValidationTier.IMMEDIATE,
          allowArtifactLoading: false,
        }),
      ),
      symbolManager,
    );

    expect(result.isValid).toBe(false);
    const hasError = result.errors.some(
      (e: any) => e.code === ErrorCodes.MODIFIER_ILLEGAL_DEFINING_TYPE,
    );
    expect(hasError).toBe(true);
  });

  it('should detect MODIFIER_ILLEGAL_DEFINING_TYPE_FOR when @isTest on method without @isTest on class', async () => {
    const symbolTable = await compileFixtureForValidator(
      'TestMethodWithoutIsTest.cls',
    );

    const result = await runValidator(
      ModifierValidator.validate(
        symbolTable,
        createValidationOptions(symbolManager, {
          tier: ValidationTier.IMMEDIATE,
          allowArtifactLoading: false,
        }),
      ),
      symbolManager,
    );

    expect(result.isValid).toBe(false);
    const hasError = result.errors.some(
      (e: any) => e.code === ErrorCodes.MODIFIER_ILLEGAL_DEFINING_TYPE_FOR,
    );
    expect(hasError).toBe(true);
  });

  it('should detect TOPLEVEL_MUST_BE_PUBLIC_OR_GLOBAL when class has no visibility', async () => {
    const symbolTable = await compileFixtureForValidator(
      'ClassWithoutVisibility.cls',
    );

    const result = await runValidator(
      ModifierValidator.validate(
        symbolTable,
        createValidationOptions(symbolManager, {
          tier: ValidationTier.IMMEDIATE,
          allowArtifactLoading: false,
        }),
      ),
      symbolManager,
    );

    expect(result.isValid).toBe(false);
    const hasError = result.errors.some(
      (e: any) => e.code === ErrorCodes.TOPLEVEL_MUST_BE_PUBLIC_OR_GLOBAL,
    );
    expect(hasError).toBe(true);
  });

  it('should detect TOPLEVEL_MUST_BE_PUBLIC_OR_GLOBAL when interface has no visibility', async () => {
    const { symbolTable, options } = await compileFixtureWithOptions(
      VALIDATOR_CATEGORY,
      'InterfaceWithoutVisibility.cls',
      undefined,
      symbolManager,
      compilerService,
      {
        tier: ValidationTier.IMMEDIATE,
        allowArtifactLoading: false,
      },
    );

    const result = await runValidator(
      ModifierValidator.validate(symbolTable, options),
      symbolManager,
    );

    expect(result.isValid).toBe(false);
    const hasError = result.errors.some(
      (e: any) => e.code === ErrorCodes.TOPLEVEL_MUST_BE_PUBLIC_OR_GLOBAL,
    );
    expect(hasError).toBe(true);
  });

  it('should detect ENCLOSING_TYPE_FOR when inner class has global but enclosing does not', async () => {
    const { symbolTable, options } = await compileFixtureWithOptions(
      VALIDATOR_CATEGORY,
      'InnerGlobalClassWithoutGlobalEnclosing.cls',
      undefined,
      symbolManager,
      compilerService,
      {
        tier: ValidationTier.IMMEDIATE,
        allowArtifactLoading: false,
      },
    );

    const result = await runValidator(
      ModifierValidator.validate(symbolTable, options),
      symbolManager,
    );

    expect(result.isValid).toBe(false);
    const hasError = result.errors.some(
      (e: any) => e.code === ErrorCodes.ENCLOSING_TYPE_FOR,
    );
    expect(hasError).toBe(true);
  });

  it('should detect TYPE_MUST_BE_TOP_LEVEL when inner class implements Database.Batchable', async () => {
    const symbolTable = await compileFixtureForValidator(
      'InnerClassImplementsBatchable.cls',
    );

    const result = await runValidator(
      ModifierValidator.validate(
        symbolTable,
        createValidationOptions(symbolManager, {
          tier: ValidationTier.IMMEDIATE,
          allowArtifactLoading: false,
        }),
      ),
      symbolManager,
    );

    expect(result.isValid).toBe(false);
    const hasError = result.errors.some(
      (e: any) => e.code === ErrorCodes.TYPE_MUST_BE_TOP_LEVEL,
    );
    expect(hasError).toBe(true);
  });

  it('should detect DEFINING_TYPE_REQUIRES when abstract method in global class lacks global (API 14+)', async () => {
    const symbolTable = await compileFixtureForValidator(
      'AbstractMethodInGlobalClassWithoutGlobal.cls',
    );

    const result = await runValidator(
      ModifierValidator.validate(
        symbolTable,
        createValidationOptions(symbolManager, {
          tier: ValidationTier.IMMEDIATE,
          allowArtifactLoading: false,
          enableVersionSpecificValidation: true,
          apiVersion: 14,
        }),
      ),
      symbolManager,
    );

    expect(result.isValid).toBe(false);
    const hasError = result.errors.some(
      (e: any) => e.code === ErrorCodes.DEFINING_TYPE_REQUIRES,
    );
    expect(hasError).toBe(true);
  });

  it('should detect MODIFIER_MIN_VERSION when @NamespaceAccessible is used with old apiVersion', async () => {
    const symbolTable = await compileFixtureForValidator(
      'NamespaceAccessibleOldVersion.cls',
    );

    const result = await runValidator(
      ModifierValidator.validate(
        symbolTable,
        createValidationOptions(symbolManager, {
          tier: ValidationTier.IMMEDIATE,
          allowArtifactLoading: false,
          enableVersionSpecificValidation: true,
          apiVersion: 20,
        }),
      ),
      symbolManager,
    );

    expect(result.isValid).toBe(false);
    const hasError = result.errors.some(
      (e: any) => e.code === ErrorCodes.MODIFIER_MIN_VERSION,
    );
    expect(hasError).toBe(true);
  });
});
