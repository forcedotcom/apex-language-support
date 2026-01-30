/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { EnumLimitValidator } from '../../../../src/semantics/validation/validators';
import { ValidationTier } from '../../../../src/semantics/validation/ValidationTier';
import { ApexSymbolManager } from '../../../../src/symbols/ApexSymbolManager';
import { CompilerService } from '../../../../src/parser/compilerService';
import { ErrorCodes } from '../../../../src/generated/ErrorCodes';
import {
  compileFixture,
  getMessage,
  runValidator,
  createValidationOptions,
} from './helpers/validation-test-helpers';

describe('EnumLimitValidator', () => {
  let symbolManager: ApexSymbolManager;
  let compilerService: CompilerService;

  beforeEach(() => {
    symbolManager = new ApexSymbolManager();
    compilerService = new CompilerService();
  });

  afterEach(() => {
    symbolManager.clear();
  });

  const VALIDATOR_CATEGORY = 'enum-limit';

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
    expect(EnumLimitValidator.id).toBe('enum-limit');
    expect(EnumLimitValidator.name).toBe('Enum Constant Limit Validator');
    expect(EnumLimitValidator.tier).toBe(ValidationTier.IMMEDIATE);
    expect(EnumLimitValidator.priority).toBe(1);
  });

  it('should pass validation for enum with 100 constants', async () => {
    const symbolTable = await compileFixtureForValidator('ValidEnum.cls');

    const result = await runValidator(
      EnumLimitValidator.validate(
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

  it('should fail validation for enum with 101 constants', async () => {
    const symbolTable = await compileFixtureForValidator('InvalidEnum.cls');

    const result = await runValidator(
      EnumLimitValidator.validate(
        symbolTable,
        createValidationOptions(symbolManager, {
          tier: ValidationTier.IMMEDIATE,
          allowArtifactLoading: false,
        }),
      ),
      symbolManager,
    );

    expect(result.isValid).toBe(false);
    expect(result.errors).toHaveLength(1);
    const error = result.errors[0];
    expect(error.code).toBe(ErrorCodes.MAX_ENUMS_EXCEEDED);
    const errorMessage = getMessage(error);
    expect(errorMessage).toContain('100');
  });

  it('should fail validation for enum with 150 constants', async () => {
    const symbolTable = await compileFixtureForValidator('HugeEnum.cls');

    const result = await runValidator(
      EnumLimitValidator.validate(
        symbolTable,
        createValidationOptions(symbolManager, {
          tier: ValidationTier.IMMEDIATE,
          allowArtifactLoading: false,
        }),
      ),
      symbolManager,
    );

    expect(result.isValid).toBe(false);
    expect(result.errors).toHaveLength(1);
    const error = result.errors[0];
    expect(error.code).toBe(ErrorCodes.MAX_ENUMS_EXCEEDED);
    const errorMessage = getMessage(error);
    expect(errorMessage).toContain('100');
  });

  it('should pass validation for enum with 1 constant', async () => {
    const symbolTable = await compileFixtureForValidator('SmallEnum.cls');

    const result = await runValidator(
      EnumLimitValidator.validate(
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

  it('should pass validation for enum with 0 constants', async () => {
    const symbolTable = await compileFixtureForValidator('EmptyEnum.cls');

    const result = await runValidator(
      EnumLimitValidator.validate(
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
});
