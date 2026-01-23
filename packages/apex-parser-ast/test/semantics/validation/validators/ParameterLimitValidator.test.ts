/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ParameterLimitValidator } from '../../../../src/semantics/validation/validators/ParameterLimitValidator';
import { ValidationTier } from '../../../../src/semantics/validation/ValidationTier';
import { ApexSymbolManager } from '../../../../src/symbols/ApexSymbolManager';
import { CompilerService } from '../../../../src/parser/compilerService';
import {
  compileFixture,
  getMessage,
  runValidator,
  createValidationOptions,
} from './helpers/validation-test-helpers';

describe('ParameterLimitValidator', () => {
  let symbolManager: ApexSymbolManager;
  let compilerService: CompilerService;

  beforeEach(() => {
    symbolManager = new ApexSymbolManager();
    compilerService = new CompilerService();
  });

  afterEach(() => {
    symbolManager.clear();
  });

  const VALIDATOR_CATEGORY = 'parameter-limit';

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
    expect(ParameterLimitValidator.id).toBe('parameter-limit');
    expect(ParameterLimitValidator.name).toBe(
      'Method Parameter Limit Validator',
    );
    expect(ParameterLimitValidator.tier).toBe(ValidationTier.IMMEDIATE);
    expect(ParameterLimitValidator.priority).toBe(1);
  });

  it('should pass validation for method with 32 parameters', async () => {
    const symbolTable = await compileFixtureForValidator('MethodWith32Params.cls');

    const result = await runValidator(
      ParameterLimitValidator.validate(
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

  it('should fail validation for method with 33 parameters', async () => {
    const symbolTable = await compileFixtureForValidator('MethodWith33Params.cls');

    const result = await runValidator(
      ParameterLimitValidator.validate(
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
    const errorMessage = getMessage(result.errors[0]);
    expect(errorMessage).toContain('invalidMethod');
    expect(errorMessage).toContain('33 parameters');
    expect(errorMessage).toContain('maximum is 32');
  });

  it('should fail validation for constructor with 33 parameters', async () => {
    const symbolTable = await compileFixtureForValidator(
      'ConstructorWith33Params.cls',
    );

    const result = await runValidator(
      ParameterLimitValidator.validate(
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
    const errorMessage = getMessage(result.errors[0]);
    expect(errorMessage).toContain('MyClass');
    expect(errorMessage).toContain('33 parameters');
  });

  it('should pass validation for method with no parameters', async () => {
    const symbolTable = await compileFixtureForValidator('MethodWithNoParams.cls');

    const result = await runValidator(
      ParameterLimitValidator.validate(
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
