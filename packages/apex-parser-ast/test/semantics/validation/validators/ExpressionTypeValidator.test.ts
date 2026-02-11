/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ExpressionTypeValidator } from '../../../../src/semantics/validation/validators';
import { ValidationTier } from '../../../../src/semantics/validation/ValidationTier';
import { ApexSymbolManager } from '../../../../src/symbols/ApexSymbolManager';
import { CompilerService } from '../../../../src/parser/compilerService';
import {
  compileFixture,
  loadFixture,
  runValidator,
  createValidationOptions,
} from './helpers/validation-test-helpers';
import { ErrorCodes } from '../../../../src/generated/ErrorCodes';

describe('ExpressionTypeValidator', () => {
  let symbolManager: ApexSymbolManager;
  let compilerService: CompilerService;

  beforeEach(() => {
    symbolManager = new ApexSymbolManager();
    compilerService = new CompilerService();
  });

  afterEach(() => {
    symbolManager.clear();
  });

  const VALIDATOR_CATEGORY = 'expression-type';

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
    expect(ExpressionTypeValidator.id).toBe('expression-type');
    expect(ExpressionTypeValidator.name).toBe('Expression Type Validator');
    expect(ExpressionTypeValidator.tier).toBe(ValidationTier.IMMEDIATE);
    expect(ExpressionTypeValidator.priority).toBe(8);
  });

  it('should detect void variable', async () => {
    const symbolTable = await compileFixtureForValidator('VoidVariable.cls');
    const sourceContent = loadFixture(VALIDATOR_CATEGORY, 'VoidVariable.cls');

    const result = await runValidator(
      ExpressionTypeValidator.validate(
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
    expect(error.code).toBe(ErrorCodes.INVALID_VOID_VARIABLE);
  });

  it('should detect void parameter', async () => {
    const symbolTable = await compileFixtureForValidator('VoidParameter.cls');
    const sourceContent = loadFixture(VALIDATOR_CATEGORY, 'VoidParameter.cls');

    const result = await runValidator(
      ExpressionTypeValidator.validate(
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
    expect(error.code).toBe(ErrorCodes.INVALID_VOID_PARAMETER);
  });

  it('should detect void property', async () => {
    const symbolTable = await compileFixtureForValidator('VoidProperty.cls');
    const sourceContent = loadFixture(VALIDATOR_CATEGORY, 'VoidProperty.cls');

    const result = await runValidator(
      ExpressionTypeValidator.validate(
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
    expect(error.code).toBe(ErrorCodes.INVALID_VOID_PROPERTY);
  });

  it('should detect invalid expression statements', async () => {
    const symbolTable = await compileFixtureForValidator(
      'InvalidExpressionStatement.cls',
    );
    const sourceContent = loadFixture(
      VALIDATOR_CATEGORY,
      'InvalidExpressionStatement.cls',
    );

    const result = await runValidator(
      ExpressionTypeValidator.validate(
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
    // Should have errors for invalid expression statements
    const hasInvalidExpressionError = result.errors.some(
      (e: any) => e.code === ErrorCodes.INVALID_EXPRESSION_STATEMENT,
    );
    expect(hasInvalidExpressionError).toBe(true);
  });

  // Note: Boolean condition validation has been moved to ExpressionValidator
  // which uses comprehensive expression type resolution instead of heuristics.
  // Tests for boolean condition validation are now in ExpressionValidator.test.ts

  it('should pass valid expressions', async () => {
    const symbolTable = await compileFixtureForValidator(
      'ValidExpressions.cls',
    );
    const sourceContent = loadFixture(
      VALIDATOR_CATEGORY,
      'ValidExpressions.cls',
    );

    const result = await runValidator(
      ExpressionTypeValidator.validate(
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
    expect(result.errors.length).toBe(0);
  });
});
