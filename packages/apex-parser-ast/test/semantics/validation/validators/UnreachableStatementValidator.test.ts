/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { UnreachableStatementValidator } from '../../../../src/semantics/validation/validators';
import { ValidationTier } from '../../../../src/semantics/validation/ValidationTier';
import { ApexSymbolManager } from '../../../../src/symbols/ApexSymbolManager';
import { CompilerService } from '../../../../src/parser/compilerService';
import {
  compileFixture,
  getMessage,
  runValidator,
  createValidationOptions,
  loadFixture,
} from './helpers/validation-test-helpers';
import { ErrorCodes } from '../../../../src/generated/ErrorCodes';

describe('UnreachableStatementValidator', () => {
  let symbolManager: ApexSymbolManager;
  let compilerService: CompilerService;

  beforeEach(() => {
    symbolManager = new ApexSymbolManager();
    compilerService = new CompilerService();
  });

  afterEach(() => {
    symbolManager.clear();
  });

  const VALIDATOR_CATEGORY = 'unreachable-statement';

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
    expect(UnreachableStatementValidator.id).toBe('unreachable-statement');
    expect(UnreachableStatementValidator.name).toBe(
      'Unreachable Statement Validator',
    );
    expect(UnreachableStatementValidator.tier).toBe(ValidationTier.IMMEDIATE);
    expect(UnreachableStatementValidator.priority).toBe(2);
  });

  it('should pass validation for code with no unreachable statements', async () => {
    const symbolTable = await compileFixtureForValidator(
      'ValidNoUnreachable.cls',
    );
    const sourceContent = loadFixture(
      VALIDATOR_CATEGORY,
      'ValidNoUnreachable.cls',
    );

    const result = await runValidator(
      UnreachableStatementValidator.validate(
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

  it('should detect unreachable statement after return', async () => {
    const symbolTable = await compileFixtureForValidator(
      'UnreachableAfterReturn.cls',
    );
    const sourceContent = loadFixture(
      VALIDATOR_CATEGORY,
      'UnreachableAfterReturn.cls',
    );

    const result = await runValidator(
      UnreachableStatementValidator.validate(
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
    const error = result.errors[0] as any;
    expect(error.code).toBe(ErrorCodes.UNREACHABLE_STATEMENT);
    expect(getMessage(error)).toContain('Unreachable statement');
  });

  it('should detect unreachable statement after throw', async () => {
    const symbolTable = await compileFixtureForValidator(
      'UnreachableAfterThrow.cls',
    );
    const sourceContent = loadFixture(
      VALIDATOR_CATEGORY,
      'UnreachableAfterThrow.cls',
    );

    const result = await runValidator(
      UnreachableStatementValidator.validate(
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
    const error = result.errors[0] as any;
    expect(error.code).toBe(ErrorCodes.UNREACHABLE_STATEMENT);
  });

  it('should detect multiple unreachable statements after return', async () => {
    const symbolTable = await compileFixtureForValidator(
      'UnreachableMultipleStatements.cls',
    );
    const sourceContent = loadFixture(
      VALIDATOR_CATEGORY,
      'UnreachableMultipleStatements.cls',
    );

    const result = await runValidator(
      UnreachableStatementValidator.validate(
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
    expect(result.errors.length).toBeGreaterThanOrEqual(3); // At least 3 unreachable statements
    result.errors.forEach((error: any) => {
      expect(error.code).toBe(ErrorCodes.UNREACHABLE_STATEMENT);
    });
  });

  it('should detect unreachable statement in if block', async () => {
    const symbolTable = await compileFixtureForValidator(
      'UnreachableInIfBlock.cls',
    );
    const sourceContent = loadFixture(
      VALIDATOR_CATEGORY,
      'UnreachableInIfBlock.cls',
    );

    const result = await runValidator(
      UnreachableStatementValidator.validate(
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
    const error = result.errors[0] as any;
    expect(error.code).toBe(ErrorCodes.UNREACHABLE_STATEMENT);
  });

  it('should skip validation when sourceContent is not provided', async () => {
    const symbolTable = await compileFixtureForValidator(
      'UnreachableAfterReturn.cls',
    );

    const result = await runValidator(
      UnreachableStatementValidator.validate(
        symbolTable,
        createValidationOptions(symbolManager, {
          tier: ValidationTier.IMMEDIATE,
          allowArtifactLoading: false,
          // sourceContent not provided
        }),
      ),
      symbolManager,
    );

    // Should skip validation and return valid result
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
