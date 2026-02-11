/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { DuplicateFieldInitValidator } from '../../../../src/semantics/validation/validators';
import { ValidationTier } from '../../../../src/semantics/validation/ValidationTier';
import { ApexSymbolManager } from '../../../../src/symbols/ApexSymbolManager';
import { CompilerService } from '../../../../src/parser/compilerService';
import {
  compileFixture,
  runValidator,
  createValidationOptions,
  loadFixture,
  compileFixtureWithOptions,
} from './helpers/validation-test-helpers';
import { ErrorCodes } from '../../../../src/generated/ErrorCodes';

describe('DuplicateFieldInitValidator', () => {
  let symbolManager: ApexSymbolManager;
  let compilerService: CompilerService;

  beforeEach(() => {
    symbolManager = new ApexSymbolManager();
    compilerService = new CompilerService();
  });

  afterEach(() => {
    symbolManager.clear();
  });

  const VALIDATOR_CATEGORY = 'duplicate-field-init';

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
    expect(DuplicateFieldInitValidator.id).toBe('duplicate-field-init');
    expect(DuplicateFieldInitValidator.name).toBe(
      'Duplicate Field Initialization Validator',
    );
    expect(DuplicateFieldInitValidator.tier).toBe(ValidationTier.IMMEDIATE);
    expect(DuplicateFieldInitValidator.priority).toBe(8);
  });

  it('should pass validation for valid constructor expressions', async () => {
    const symbolTable = await compileFixtureForValidator(
      'ValidConstructorExpressions.cls',
    );
    const sourceContent = loadFixture(
      VALIDATOR_CATEGORY,
      'ValidConstructorExpressions.cls',
    );

    const result = await runValidator(
      DuplicateFieldInitValidator.validate(
        symbolTable,
        createValidationOptions(symbolManager, {
          tier: ValidationTier.IMMEDIATE,
          allowArtifactLoading: false,
          sourceContent,
        }),
      ),
      symbolManager,
    );

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should report error for duplicate field initialization', async () => {
    const symbolTable = await compileFixtureForValidator(
      'InvalidConstructorExpressions.cls',
    );
    const sourceContent = loadFixture(
      VALIDATOR_CATEGORY,
      'InvalidConstructorExpressions.cls',
    );

    const result = await runValidator(
      DuplicateFieldInitValidator.validate(
        symbolTable,
        createValidationOptions(symbolManager, {
          tier: ValidationTier.IMMEDIATE,
          allowArtifactLoading: false,
          sourceContent,
        }),
      ),
      symbolManager,
    );

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    const hasDuplicateFieldInitError = result.errors.some(
      (e: any) => e.code === ErrorCodes.DUPLICATE_FIELD_INIT,
    );
    expect(hasDuplicateFieldInitError).toBe(true);
  });

  it('should report INVALID_NAME_VALUE_PAIR_CONSTRUCTOR for primitive type', async () => {
    const { symbolTable, options } = await compileFixtureWithOptions(
      VALIDATOR_CATEGORY,
      'NameValuePairInvalid.cls',
      undefined,
      symbolManager,
      compilerService,
      {
        tier: ValidationTier.IMMEDIATE,
        allowArtifactLoading: false,
      },
    );

    const result = await runValidator(
      DuplicateFieldInitValidator.validate(symbolTable, options),
      symbolManager,
    );

    expect(result.isValid).toBe(false);
    const hasError = result.errors.some(
      (e: any) => e.code === ErrorCodes.INVALID_NAME_VALUE_PAIR_CONSTRUCTOR,
    );
    expect(hasError).toBe(true);
  });
});
