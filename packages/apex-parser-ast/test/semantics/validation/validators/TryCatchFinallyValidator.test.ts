/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { TryCatchFinallyValidator } from '../../../../src/semantics/validation/validators';
import { ValidationTier } from '../../../../src/semantics/validation/ValidationTier';
import { ApexSymbolManager } from '../../../../src/symbols/ApexSymbolManager';
import { CompilerService } from '../../../../src/parser/compilerService';
import {
  compileFixture,
  runValidator,
  createValidationOptions,
  loadFixture,
} from './helpers/validation-test-helpers';
import { ErrorCodes } from '../../../../src/generated/ErrorCodes';

describe('TryCatchFinallyValidator', () => {
  let symbolManager: ApexSymbolManager;
  let compilerService: CompilerService;

  beforeEach(() => {
    symbolManager = new ApexSymbolManager();
    compilerService = new CompilerService();
  });

  afterEach(() => {
    symbolManager.clear();
  });

  const VALIDATOR_CATEGORY = 'try-catch-finally';

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
    expect(TryCatchFinallyValidator.id).toBe('try-catch-finally');
    expect(TryCatchFinallyValidator.name).toBe('Try-Catch-Finally Validator');
    expect(TryCatchFinallyValidator.tier).toBe(ValidationTier.IMMEDIATE);
    expect(TryCatchFinallyValidator.priority).toBe(3);
  });

  it('should report error for try block without catch or finally', async () => {
    const symbolTable = await compileFixtureForValidator(
      'NoCatchOrFinally.cls',
    );
    const sourceContent = loadFixture(
      VALIDATOR_CATEGORY,
      'NoCatchOrFinally.cls',
    );

    const result = await runValidator(
      TryCatchFinallyValidator.validate(
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
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].code).toBe(
      ErrorCodes.INVALID_TRY_NEEDS_CATCH_OR_FINALLY,
    );
  });

  it('should pass validation for try block with catch', async () => {
    const symbolTable = await compileFixtureForValidator('TryWithCatch.cls');
    const sourceContent = loadFixture(VALIDATOR_CATEGORY, 'TryWithCatch.cls');

    const result = await runValidator(
      TryCatchFinallyValidator.validate(
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

  it('should pass validation for try block with finally', async () => {
    const symbolTable = await compileFixtureForValidator('TryWithFinally.cls');
    const sourceContent = loadFixture(VALIDATOR_CATEGORY, 'TryWithFinally.cls');

    const result = await runValidator(
      TryCatchFinallyValidator.validate(
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

  it('should pass validation for try block with catch and finally', async () => {
    const symbolTable = await compileFixtureForValidator(
      'TryWithCatchAndFinally.cls',
    );
    const sourceContent = loadFixture(
      VALIDATOR_CATEGORY,
      'TryWithCatchAndFinally.cls',
    );

    const result = await runValidator(
      TryCatchFinallyValidator.validate(
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

  it('should validate each try statement independently', async () => {
    const symbolTable = await compileFixtureForValidator(
      'MultipleTryStatements.cls',
    );
    const sourceContent = loadFixture(
      VALIDATOR_CATEGORY,
      'MultipleTryStatements.cls',
    );

    const result = await runValidator(
      TryCatchFinallyValidator.validate(
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
    expect(result.errors).toHaveLength(1); // Only one invalid try
  });

  it('should validate nested try statements correctly', async () => {
    const symbolTable = await compileFixtureForValidator(
      'NestedTryStatements.cls',
    );
    const sourceContent = loadFixture(
      VALIDATOR_CATEGORY,
      'NestedTryStatements.cls',
    );

    const result = await runValidator(
      TryCatchFinallyValidator.validate(
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
    expect(result.errors).toHaveLength(1); // Inner try without catch/finally
  });
});
