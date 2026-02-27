/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ReturnStatementValidator } from '../../../../src/semantics/validation/validators';
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

describe('ReturnStatementValidator', () => {
  let symbolManager: ApexSymbolManager;
  let compilerService: CompilerService;

  beforeEach(() => {
    symbolManager = new ApexSymbolManager();
    compilerService = new CompilerService();
  });

  afterEach(() => {
    symbolManager.clear();
  });

  const VALIDATOR_CATEGORY = 'return-statement';

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
    expect(ReturnStatementValidator.id).toBe('return-statement');
    expect(ReturnStatementValidator.name).toBe('Return Statement Validator');
    expect(ReturnStatementValidator.tier).toBe(ValidationTier.IMMEDIATE);
    expect(ReturnStatementValidator.priority).toBe(4);
  });

  it('should report error for void method returning a value', async () => {
    const symbolTable = await compileFixtureForValidator(
      'VoidMethodReturnsValue.cls',
    );
    const sourceContent = loadFixture(
      VALIDATOR_CATEGORY,
      'VoidMethodReturnsValue.cls',
    );

    const result = await runValidator(
      ReturnStatementValidator.validate(
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
    expect(result.errors[0].code).toBe(ErrorCodes.INVALID_RETURN_VOID);
  });

  it('should pass validation for void method returning without value', async () => {
    const symbolTable = await compileFixtureForValidator(
      'VoidMethodReturnsCorrectly.cls',
    );
    const sourceContent = loadFixture(
      VALIDATOR_CATEGORY,
      'VoidMethodReturnsCorrectly.cls',
    );

    const result = await runValidator(
      ReturnStatementValidator.validate(
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

  it('should pass validation for non-void method returning a value', async () => {
    const symbolTable = await compileFixtureForValidator(
      'NonVoidMethodReturnsValue.cls',
    );
    const sourceContent = loadFixture(
      VALIDATOR_CATEGORY,
      'NonVoidMethodReturnsValue.cls',
    );

    const result = await runValidator(
      ReturnStatementValidator.validate(
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

  it('should report error for trigger returning a value', async () => {
    const symbolTable = await compileFixtureForValidator(
      'TriggerReturnsValue.trigger',
    );
    const sourceContent = loadFixture(
      VALIDATOR_CATEGORY,
      'TriggerReturnsValue.trigger',
    );

    const result = await runValidator(
      ReturnStatementValidator.validate(
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
    expect(result.errors[0].code).toBe(ErrorCodes.INVALID_TRIGGER_RETURN);
  });

  it('should pass validation for trigger without return statement', async () => {
    const symbolTable = await compileFixtureForValidator(
      'TriggerReturnsCorrectly.trigger',
    );
    const sourceContent = loadFixture(
      VALIDATOR_CATEGORY,
      'TriggerReturnsCorrectly.trigger',
    );

    const result = await runValidator(
      ReturnStatementValidator.validate(
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
});
